import { LLMProvider, LLMResponse, LLM_STATUS } from "../types.ts";

export class FakeProvider implements LLMProvider {
  readonly name = "fake";

  async rephrase(prompt: string): Promise<LLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    
    if (prompt.includes("USER_ERROR")) {
      return {
        status: LLM_STATUS.USER_ERROR,
        error_message: "User input validation failed",
        input_tokens: 5,
        output_tokens: 10,
      };
    }
    
    if (prompt.includes("SERVER_ERROR")) {
      return {
        status: LLM_STATUS.SERVER_ERROR,
        error_message: "Internal server error occurred",
        input_tokens: 0,
        output_tokens: 0,
      };
    }
    
    return {
      status: LLM_STATUS.SUCCESS,
      text: `rephrased ${prompt}`,
      input_tokens: 10,
      output_tokens: 200,
    };
  }
}
