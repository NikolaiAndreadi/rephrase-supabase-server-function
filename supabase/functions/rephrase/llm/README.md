# LLM Provider System

Abstraction layer for multiple AI providers and models with unified interface.

## Structure
- `index.ts` - Provider factory
- `types.ts` - LLM interfaces  
- `providers/fake.ts` - Mock provider for testing

## Usage
```typescript
const provider = getLLMProviderFromEnv();
const result = await provider.rephrase(prompt);
```

## Adding Providers
1. Implement `LLMProvider` interface
2. Register in `PROVIDERS` object
3. Set `LLM_PROVIDER` environment variable

## Configuration
```env
LLM_PROVIDER=fake  # or openai-gpt4, anthropic-haiku, etc.
``` 