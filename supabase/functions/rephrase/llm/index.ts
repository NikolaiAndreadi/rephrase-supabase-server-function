import { FakeProvider } from "./providers/fake.ts";
import { LLMProvider } from "./types.ts";

const PROVIDERS = {
  "fake": () => new FakeProvider(),
} as const;

type ProviderName = keyof typeof PROVIDERS;

function isValidProvider(name: string): name is ProviderName {
  return name in PROVIDERS;
}

export function getLLMProviderFromEnv(): LLMProvider | Error {
  const name = Deno.env.get("LLM_PROVIDER");
  if (!name) {
    return new Error("LLM_PROVIDER environment variable is not set");
  }

  if (!isValidProvider(name)) {
    return new Error(`Unknown LLM_PROVIDER '${name}'`);
  }

  return PROVIDERS[name]();
}
