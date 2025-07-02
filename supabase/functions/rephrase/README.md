# Rephrase API Function

The core Edge Function that handles text rephrasing requests with AI integration, token management, and comprehensive error handling.

## 🎯 Overview

This function provides a production-ready API endpoint for rephrasing text using different writing styles. It includes:

- **Multiple writing styles**: Formal, casual, technical, etc.
- **Idempotency support**: Prevent duplicate processing
- **Comprehensive audit trail**: Track all requests and outcomes
- **Transaction safety**: Atomic balance updates
- **LLM provider abstraction**: Support multiple AI providers

## 🔌 API Endpoint

### `POST /functions/v1/rephrase`

Transform text using AI with specified writing style.

### Request Format
```json
{
  "text": "Your text to rephrase (3-2000 characters)",
  "style_id": "550e8400-e29b-41d4-a716-446655440000",
  "idempotency_key": "unique-uuid-for-duplicate-prevention"
}
```

### Response Format

**Success (200 idempotent OK, 201 Created):**
```json
{
  "rephrased": "The AI-transformed text in the requested style"
}
```

**Client Error (400/401/404/402/422):**
```json
{
  "reason": "Descriptive error message",
  "issues": [
    {
      "path": "text",
      "message": "Text must be between 3 and 2000 characters"
    }
  ]
}
```

**Error Categories**

**Client Errors (4xx):**
- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Style not found
- `402 Payment Required`: Insufficient user funds
- `422 Unprocessable Entity`: Content policy violation

**Server Errors (5xx):**
- `500 Internal Server Error`: Unexpected errors, critical failures

## 🏗️ Architecture

```
┌─────────────────┐
│ HTTP Request    │
└─────────┬───────┘
          │
┌─────────▼───────┐    ┌─────────────────┐
│ Authentication  │    │ Request         │
│ & Validation    │◄──►│ Validation      │
└─────────┬───────┘    └─────────────────┘
          │
┌─────────▼───────┐
│ Database        │
│ Transaction     │
└─────────┬───────┘
          │
    ┌─────▼─────┐    ┌─────────────┐    ┌─────────────┐
    │ Balance   │    │ Style       │    │ Duplicate   │
    │ Check     │    │ Lookup      │    │ Check       │
    └─────┬─────┘    └─────────────┘    └─────────────┘
          │
    ┌─────▼─────┐    ┌─────────────┐
    │ LLM       │◄──►│ Prompt      │
    │ Provider  │    │ Building    │
    └─────┬─────┘    └─────────────┘
          │
    ┌─────▼─────┐    ┌─────────────┐
    │ Result    │    │ Balance     │
    │ Storage   │    │ Update      │
    └───────────┘    └─────────────┘
```

## 📁 File Structure

```
rephrase/
├── index.ts          # Server function entrypoint & main logic
├── db.ts             # Database operations and queries
├── prompt.ts         # Prompt building and token calculation (stripped-down version)
└── llm/              # LLM provider system
```

## Refund Policy
- **Server errors**: No balance changes
- **User errors**: Balance deducted (violation of terms, llm processed the request)
- **Successful requests**: Balance deducted

