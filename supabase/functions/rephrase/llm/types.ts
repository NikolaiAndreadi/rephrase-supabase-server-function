export type LLMResponseOk = {
  success: true;
  text: string;
  input_tokens: number;
  output_tokens: number;
};

export type LLMResponseFail = {
  success: false;
  server_error: boolean;
  error_message: string;
  input_tokens: number;
  output_tokens: number;
};

export type LLMResponse = LLMResponseOk | LLMResponseFail;

export interface LLMProvider {
  readonly name: string;
  rephrase(prompt: string): Promise<LLMResponse>;
}
