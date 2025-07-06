# AI Text Rephrasing Service Example

AI text rephrasing API, built on Supabase Edge Functions.

⚠️ Development Checkpoint for Portfolio

This is a simplified version of an in-development customer project and will not receive updates.

**Limitations:**
- **No frontend implementation, No other server functions** - single rephrase endpoint only  
- **No observability/monitoring** - basic console logging only
- **Synchronous LLM processing** - no background tasks or async jobs. At this development checkpoint stage, synchronous transactions were chosen to prioritize rapid feature delivery over optimal scalability (at least at time of this development checkpoint).
- **Only fake LLM provider** - no real AI integrations (OpenAI, Anthropic, etc.), no deadline/retry logic
- **Simplified pricing logic** - basic fake prompt builder and token counter

## Features
- AI-powered text rephrasing with multiple writing styles
- Idempotency support and comprehensive audit trail
- PostgreSQL with Row Level Security
- Extensible LLM provider system

## API Usage

**POST** `/functions/v1/rephrase`
```json
{
  "text": "Text to rephrase",
  "style_id": "uuid-of-writing-style", 
  "idempotency_key": "unique-uuid"
}
```

**Response:**
```json
{
  "rephrased": "AI-transformed text"
}
```

## Architecture
- **Edge Functions**: Serverless Deno runtime
- **Database**: PostgreSQL with migrations  
- **Authentication**: Supabase Auth
- **LLM Integration**: Pluggable provider system
- **Testing**: Comprehensive test suite

## Tech Stack
- TypeScript + Deno
- Supabase (PostgreSQL + Edge Functions)
- Zod validation
