# Supabase Edge Functions

Serverless functions running on Deno with global distribution.

## Structure
- `common/` - Shared utilities (response helpers, transactions)
- `rephrase/` - Main API endpoint for text rephrasing  
- `test/` - Test suite

## Development
```bash
supabase start             # Init project, run migrations
npm run backend:functions  # Start locally
npm run backend:test       # Run tests
```
