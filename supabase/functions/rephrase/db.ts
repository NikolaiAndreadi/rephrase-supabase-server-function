import { PoolClient } from "jsr:@db/postgres";
import type { Tables } from "@/common/database.types.ts";
import type { RephraseRequest } from "@/common/rephrase.ts";
import { LLMResponseFail, LLMResponseOk } from "./llm/types.ts";

export const REPHRASE_STATUS = {
  REPHRASED: "REPHRASED",
  FAILED: "FAILED",
  BAD_USER_REQUEST: "BAD_USER_REQUEST",
} as const;

export type RephraseStatus =
  (typeof REPHRASE_STATUS)[keyof typeof REPHRASE_STATUS];

export const lockUserBalance = async (
  conn: PoolClient,
  userId: string,
): Promise<number | undefined> => {
  const { rows } = await conn.queryObject<Pick<Tables<"users">, "balance">>(
    "SELECT balance FROM public.users WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  return rows.at(0)?.balance;
};

export const findExistingRephrase = async (
  conn: PoolClient,
  userId: string,
  idempotencyKey: string,
): Promise<string | undefined> => {
  const { rows } = await conn.queryObject<
    Pick<Tables<"rephrase_history">, "output_text">
  >(
    "SELECT output_text FROM public.rephrase_history WHERE user_id = $1 AND idempotency_key = $2 AND status != $3",
    [userId, idempotencyKey, REPHRASE_STATUS.FAILED],
  );
  return rows.at(0)?.output_text ?? undefined;
};

export const getPromptStyle = async (
  conn: PoolClient,
  styleId: string,
): Promise<string | undefined> => {
  const { rows } = await conn.queryObject<
    Pick<Tables<"rephrase_styles">, "prompt">
  >(
    "SELECT prompt FROM public.rephrase_styles WHERE id = $1 AND is_enabled = true",
    [styleId],
  );
  return rows.at(0)?.prompt;
};

export const storeRephraseResult = async (
  conn: PoolClient,
  userId: string,
  newBalance: number,
  userTokenPrice: number,
  rephraseParams: RephraseRequest,
  prompt: string,
  llmProviderName: string,
  llmResult: LLMResponseOk,
): Promise<void> => {
  await conn.queryObject(
    "UPDATE public.users SET balance = $1, updated_at = NOW() WHERE user_id = $2",
    [newBalance, userId],
  );

  await conn.queryObject<Tables<"rephrase_history">>(
    `INSERT INTO public.rephrase_history
(user_id, cost, prompt, status,
input_text, style_id, idempotency_key, model, output_text,
model_input_tokens, model_output_tokens)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      userId,
      userTokenPrice,
      prompt,
      REPHRASE_STATUS.REPHRASED,
      rephraseParams.text,
      rephraseParams.style_id,
      rephraseParams.idempotency_key,
      llmProviderName,
      llmResult.text,
      llmResult.input_tokens,
      llmResult.output_tokens,
    ],
  );
};

export const storeRephraseUserFail = async (
  conn: PoolClient,
  userId: string,
  newBalance: number,
  userTokenPrice: number,
  rephraseParams: RephraseRequest,
  prompt: string,
  llmProviderName: string,
  llmResult: LLMResponseFail,
  userMessage: string,
): Promise<void> => {
  await conn.queryObject(
    "UPDATE public.users SET balance = $1, updated_at = NOW() WHERE user_id = $2",
    [newBalance, userId],
  );

  await conn.queryObject<Tables<"rephrase_history">>(
    `INSERT INTO public.rephrase_history
(user_id, cost, prompt, status, input_text, style_id, idempotency_key,
model, error_message, model_input_tokens, model_output_tokens, error_message_internal)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      userId,
      userTokenPrice,
      prompt,
      REPHRASE_STATUS.BAD_USER_REQUEST,
      rephraseParams.text,
      rephraseParams.style_id,
      rephraseParams.idempotency_key,
      llmProviderName,
      userMessage,
      llmResult.input_tokens,
      llmResult.output_tokens,
      llmResult.error_message,
    ],
  );
};

export const storeRephraseServerFail = async (
  conn: PoolClient,
  userId: string,
  rephraseParams: RephraseRequest,
  prompt: string,
  llmProviderName: string,
  llmResult: LLMResponseFail,
): Promise<void> => {
  await conn.queryObject<Tables<"rephrase_history">>(
    `INSERT INTO public.rephrase_history
(user_id, status, input_text, cost, style_id, error_message,
prompt, model, model_input_tokens, model_output_tokens, error_message_internal)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      userId,
      REPHRASE_STATUS.FAILED,
      rephraseParams.text,
      0,
      rephraseParams.style_id,
      "Server error",
      prompt,
      llmProviderName,
      llmResult.input_tokens,
      llmResult.output_tokens,
      llmResult.error_message,
    ],
  );
};
