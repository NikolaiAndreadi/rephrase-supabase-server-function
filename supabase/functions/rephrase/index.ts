import { z } from "zod";
import { createClient, User as AuthUser } from "jsr:@supabase/supabase-js@2";
import { Pool, PoolClient } from "jsr:@db/postgres";
import { STATUS_CODE } from "jsr:@std/http/status";

import type { Database } from "@/common/database.types.ts";
import {
  RephraseErrorResponse,
  RephraseRequest,
  RephraseRequestSchema,
  RephraseResponse,
} from "@/common/rephrase.ts";

import { newResponse } from "@/backend_common/resp.ts";
import {
  type TransactionResult,
  TxFail,
  TxOk,
  WithTransaction,
} from "@/backend_common/tx.ts";

import { getLLMProviderFromEnv } from "./llm/index.ts";
import { LLMProvider, LLM_STATUS, LLMResponse, LLMResponseOk, LLMResponseFail } from "./llm/types.ts";
import { buildRephrasePrompt, calcUserTokens } from "./prompt.ts";
import {
  findExistingRephrase,
  getPromptStyle,
  lockUserBalance,
  storeRephraseResult,
  storeRephraseServerFail,
  storeRephraseUserFail,
} from "./db.ts";

const supabaseClient = createClient<Database>(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
);

const databaseUrl = Deno.env.get("SUPABASE_DB_URL")!;
const databasePoolSizeStr = Deno.env.get("DB_POOL_SIZE") || "10";
const databasePoolSize = parseInt(databasePoolSizeStr) || 10;
const pool = new Pool(databaseUrl, databasePoolSize, true);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return newResponse(null, STATUS_CODE.NoContent);
  }
  if (req.method !== "POST") {
    return newResponse("Method not allowed", STATUS_CODE.MethodNotAllowed);
  }

  try {
    return await process(req);
  } catch (error) {
    console.error("Unexpected error: ", error);
    return newResponse(
      "An unexpected error occurred",
      STATUS_CODE.InternalServerError,
    );
  }
});

async function process(req: Request): Promise<Response> {
  const llmProvider = getLLMProviderFromEnv();
  if (llmProvider instanceof Error) {
    console.error("Failed to initialize LLM provider:", llmProvider);
    return newResponse(
      "Internal server error",
      STATUS_CODE.InternalServerError,
    );
  }

  const user = await authUser(req.headers.get("Authorization"));
  if (user === undefined) {
    return newResponse("Unauthorized", STATUS_CODE.Unauthorized);
  }

  const reqJson = await req.json();
  const parseResult = RephraseRequestSchema.safeParse(reqJson);
  if (!parseResult.success) {
    const issues = parseResult.error.errors.map((issue: z.ZodIssue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    const resp: RephraseErrorResponse = {
      reason: "Invalid request body",
      issues,
    };

    return newResponse(resp, STATUS_CODE.BadRequest);
  }

  return await WithTransaction(
    pool,
    rephraseTx,
    llmProvider,
    user.id,
    parseResult.data,
  );
}

const rephraseTx = async (
  conn: PoolClient,
  llmProvider: LLMProvider,
  userId: string,
  rephraseParams: RephraseRequest,
): Promise<TransactionResult<Response>> => {
  const currentUserBalance = await lockUserBalance(conn, userId);
  if (currentUserBalance === undefined) {
    return TxFail(newResponse("Data inconsistency, authed user data not found", STATUS_CODE.InternalServerError));
  }

  const existing = await maybeGetExistingRephrase(
    conn, userId, rephraseParams.idempotency_key,
  );
  if (existing !== undefined) {
    return existing
  }

  const userTokenPrice = calcUserTokens(rephraseParams.text);
  const newBalance = currentUserBalance - userTokenPrice;
  if (newBalance < 0) {
    return TxFail(
      newResponse("Balance too low", STATUS_CODE.PaymentRequired),
    );
  }

  const stylePrompt = await getPromptStyle(conn, rephraseParams.style_id);
  if (!stylePrompt) {
    return TxFail(newResponse("Style not found", STATUS_CODE.NotFound));
  }

  const prompt = buildRephrasePrompt(rephraseParams.text, stylePrompt);

  const llmResult = await llmProvider.rephrase(prompt);

  return processRephraseResult(
    conn, userId, newBalance, userTokenPrice,
    rephraseParams, llmResult, llmProvider.name, prompt,
  );
};

const maybeGetExistingRephrase = async (
  conn: PoolClient,
  userId: string,
  idempotencyKey: string,
): Promise<undefined | TransactionResult<Response>> => {
  const existingResult = await findExistingRephrase(
    conn, userId, idempotencyKey,
  );
  if (existingResult === undefined) {
    return undefined;
  }
  switch (existingResult.type) {
    case LLM_STATUS.SUCCESS: {
      return TxOk(newResponse({ rephrased: existingResult.text }, STATUS_CODE.OK));
    }
    case LLM_STATUS.USER_ERROR: {
      const resp: RephraseErrorResponse = { reason: existingResult.message };
      return TxOk(newResponse(resp, STATUS_CODE.UnprocessableEntity));
    }
    default:
      return undefined;
  }
}

const processRephraseResult = async (
  conn: PoolClient, userId: string, newBalance: number, userTokenPrice: number,
  rephraseParams: RephraseRequest, llmResult: LLMResponse, llmProviderName: string, prompt: string,
): Promise<TransactionResult<Response>> => {
  switch (llmResult.status) {
    case LLM_STATUS.SUCCESS: {
      await storeRephraseResult(
        conn, userId, newBalance, userTokenPrice,
        rephraseParams, prompt, llmProviderName, llmResult,
      );
      const successResult = llmResult as LLMResponseOk;
      const respBody: RephraseResponse = {rephrased: successResult.text};
      return TxOk(newResponse(respBody, STATUS_CODE.Created));
    }
    case LLM_STATUS.USER_ERROR: {
      const userErrorResult = llmResult as LLMResponseFail;
      const message = "your input violates agreement";
      await storeRephraseUserFail(
        conn, userId, newBalance, userTokenPrice,
        rephraseParams, prompt, llmProviderName, userErrorResult, message,
      );
      const respBody: RephraseErrorResponse = {reason: message}
      return TxOk(newResponse(respBody, STATUS_CODE.UnprocessableEntity));
    }
    case LLM_STATUS.SERVER_ERROR: {
      const serverErrorResult = llmResult as LLMResponseFail;
      await storeRephraseServerFail(
        conn, userId, rephraseParams, prompt, llmProviderName, serverErrorResult,
      );
      return TxOk(newResponse("Internal server error", STATUS_CODE.InternalServerError));
    }
    default: {
      return TxFail(newResponse("Internal server error", STATUS_CODE.InternalServerError));
    }
  }
}

const authUser = async (
  authHeader: string | null,
): Promise<AuthUser | undefined> => {
  if (!authHeader) {
    return undefined;
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) {
    return undefined;
  }

  return data.user;
};
