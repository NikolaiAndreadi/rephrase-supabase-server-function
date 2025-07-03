export const LLM_STATUS = {
  SUCCESS: "success",
  USER_ERROR: "user_error",
  SERVER_ERROR: "server_error",
} as const;

export type LLMStatus = (typeof LLM_STATUS)[keyof typeof LLM_STATUS];

export type LLMResponseOk = {
  status: typeof LLM_STATUS.SUCCESS;
  text: string;
  input_tokens: number;
  output_tokens: number;
};

export type LLMResponseFail = {
  status: typeof LLM_STATUS.USER_ERROR | typeof LLM_STATUS.SERVER_ERROR;
  error_message: string;
  input_tokens: number;
  output_tokens: number;
};

export type LLMResponse = LLMResponseOk | LLMResponseFail;

export interface LLMProvider {
  readonly name: string;
  rephrase(prompt: string): Promise<LLMResponse>;
}
