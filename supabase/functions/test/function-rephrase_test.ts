import { assertEquals, assertExists } from 'jsr:@std/assert@1'

import { SupabaseFixture, TestStyleId } from "./helpers.ts";

Deno.test('Rephrase Success', async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { data, error } = await client.functions.invoke(
    'rephrase', {
    body: {
      text: 'hellow',
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  if (error) {
    const errorJson = await error.context.json()
    throw new Error('Invalid response: ' + errorJson)
  }
  assertEquals(data.rephrased, 'rephrased Fake global prompt.\n\nSome prompt\n\nInput text: hellow')
})

Deno.test('Rephrase No Auth', async () => {
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
})



Deno.test('Rephrase Missing Text', async () => {
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
})

Deno.test('Rephrase Text Too Short', async () => {
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
})


Deno.test('Rephrase Text Too Long', async () => {
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
})

Deno.test('Rephrase Invalid Style ID', async () => {
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
)
Deno.test('Rephrase Missing Idempotency Key', async () => {
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
})

Deno.test('Rephrase Insufficient Funds', async () => {
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
})

Deno.test('Rephrase Style Not Found', async () => {
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
})

Deno.test('Rephrase Idempotency', async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const idempotencyKey = crypto.randomUUID()
  const requestBody = {
    text: 'test idempotency',
    style_id: TestStyleId,
    idempotency_key: idempotencyKey,
  }
  
  const { data: firstData, error: firstError } = await client.functions.invoke('rephrase', {
    body: requestBody,
  })
  
  if (firstError) {
    throw new Error('First request failed: ' + firstError.message)
  }
  
  const { data: secondData, error: secondError } = await client.functions.invoke('rephrase', {
    body: requestBody,
  })
  
  if (secondError) {
    throw new Error('Second request failed: ' + secondError.message)
  }
  
  assertEquals(firstData.rephrased, secondData.rephrased)
})
