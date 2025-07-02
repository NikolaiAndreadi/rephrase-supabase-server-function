import { LLMProvider, LLMResponseOk } from "../types.ts";

export class FakeProvider implements LLMProvider {
  readonly name = "fake";

  async rephrase(prompt: string): Promise<LLMResponseOk> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      success: true,
      text: `rephrased ${prompt}`,
      input_tokens: 10,
      output_tokens: 200,
    };
  }
}
