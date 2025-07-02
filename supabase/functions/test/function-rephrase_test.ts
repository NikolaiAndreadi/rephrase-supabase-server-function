import { assertEquals, assertExists } from 'jsr:@std/assert@1'

import { SupabaseFixture, TestStyleId } from "./helpers.ts";

// ===== SUCCESS CASE =====
const testHappyCase = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { data: func_data, error: func_error } = await client.functions.invoke(
    'rephrase', {
    body: {
      text: 'hellow',
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  if (func_error) {
    throw new Error('Invalid response: ' + func_error.message)
  }
  assertEquals(func_data.rephrased, 'rephrased Fake global prompt.\n\nSome prompt\n\nInput text: hellow')
}

const testNoAuth = async () => {
  const client = await SupabaseFixture({ authedUser: false, enabledStyle: true, fundUser: true })
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'test text',
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  
  assertExists(error)
  assertEquals(await error.context.json(), 'Unauthorized')
}

// ===== VALIDATION TESTS =====
const testMissingText = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      // Missing text field
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  
  assertExists(error)
  const errorJson = await error.context.json()
  assertEquals(errorJson.reason, 'Invalid request body')
}

const testTextTooShort = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'hi', // Less than 3 characters
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  
  assertExists(error)
  const errorJson = await error.context.json()
  assertEquals(errorJson.reason, 'Invalid request body')
}

const testTextTooLong = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'a'.repeat(10000), // More than 2000 characters
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  
  assertExists(error)
  const errorJson = await error.context.json()
  assertEquals(errorJson.reason, 'Invalid request body')
}

const testInvalidStyleId = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'test text',
      style_id: 'invalid-uuid',
      idempotency_key: crypto.randomUUID(),
    },
  })
  
  assertExists(error)
  const errorJson = await error.context.json()
  assertEquals(errorJson.reason, 'Invalid request body')
}

const testMissingIdempotencyKey = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'test text',
      style_id: TestStyleId,
      // Missing idempotency_key
    },
  })
  
  assertExists(error)
  const errorJson = await error.context.json()
  assertEquals(errorJson.reason, 'Invalid request body')
}

// ===== BALANCE MANAGEMENT TESTS =====
const testInsufficientFunds = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: false }) // No funds
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'test text',
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  
  assertExists(error)
  const errorJson = await error.context.json()
  assertEquals(errorJson, 'Balance too low')
}

const testStyleNotFound = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: false, fundUser: true }) // Style disabled
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'test text',
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  
  assertExists(error)
  const errorJson = await error.context.json()
  assertEquals(errorJson, 'Style not found')
}

// ===== IDEMPOTENCY TESTS =====
const testIdempotency = async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const idempotencyKey = crypto.randomUUID()
  const requestBody = {
    text: 'test idempotency',
    style_id: TestStyleId,
    idempotency_key: idempotencyKey,
  }
  
  // First request - should succeed
  const { data: firstData, error: firstError } = await client.functions.invoke('rephrase', {
    body: requestBody,
  })
  
  if (firstError) {
    throw new Error('First request failed: ' + firstError.message)
  }
  
  // Second request with same idempotency key - should return same result
  const { data: secondData, error: secondError } = await client.functions.invoke('rephrase', {
    body: requestBody,
  })
  console.log(secondError)
  
  if (secondError) {
    throw new Error('Second request failed: ' + secondError.message)
  }
  
  // Should return the same result
  assertEquals(firstData.rephrased, secondData.rephrased)
}

// ===== TEST REGISTRATION =====
Deno.test('Rephrase Success', testHappyCase)

// Authentication Tests
Deno.test('Rephrase No Auth', testNoAuth)

// Validation Tests  
Deno.test('Rephrase Missing Text', testMissingText)
Deno.test('Rephrase Text Too Short', testTextTooShort)
Deno.test('Rephrase Text Too Long', testTextTooLong)
Deno.test('Rephrase Invalid Style ID', testInvalidStyleId)
Deno.test('Rephrase Missing Idempotency Key', testMissingIdempotencyKey)

// Balance Management Tests
Deno.test('Rephrase Insufficient Funds', testInsufficientFunds)
Deno.test('Rephrase Style Not Found', testStyleNotFound)

// Idempotency Tests
Deno.test('Rephrase Idempotency', testIdempotency)