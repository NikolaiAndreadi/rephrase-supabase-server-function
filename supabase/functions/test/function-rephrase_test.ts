import { assertEquals, assertNotEquals } from 'jsr:@std/assert@1'
import { STATUS_CODE } from "jsr:@std/http/status";

import { 
  assertError, assertSuccess,
  SupabaseFixture, TestStyleId,
  getUserBalance,
} from "./helpers.ts";


Deno.test('Rephrase Success', async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const response = await client.functions.invoke('rephrase', {
    body: {
      text: 'hellow',
      style_id: TestStyleId,
      idempotency_key: crypto.randomUUID(),
    },
  })
  assertSuccess(response, {rephrased: 'rephrased Fake global prompt.\n\nSome prompt\n\nInput text: hellow'})
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
  await assertError(error, STATUS_CODE.Unauthorized, 'Unauthorized')
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
  await assertError(error, STATUS_CODE.BadRequest, 'Invalid request body')
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
  await assertError(error, STATUS_CODE.BadRequest, 'Invalid request body')
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
  await assertError(error, STATUS_CODE.BadRequest, 'Invalid request body')
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
  await assertError(error, STATUS_CODE.BadRequest, 'Invalid request body')
})

Deno.test('Rephrase Missing Idempotency Key', async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const { error } = await client.functions.invoke('rephrase', {
    body: {
      text: 'test text',
      style_id: TestStyleId,
      // Missing idempotency_key
    },
  })
  await assertError(error, STATUS_CODE.BadRequest, 'Invalid request body')
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
  await assertError(error, STATUS_CODE.PaymentRequired, 'Balance too low')
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
  await assertError(error, STATUS_CODE.NotFound, 'Style not found')
})

Deno.test('Rephrase Idempotency', async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const idempotencyKey = crypto.randomUUID()
  
  const initialBalance = await getUserBalance(client)
  
  const responseOne = await client.functions.invoke('rephrase', {
    body: {
      text: 'test idempotency',
      style_id: TestStyleId,
      idempotency_key: idempotencyKey,
    },
  })
  assertSuccess(responseOne)
  
  const balanceAfterFirstRephrase = await getUserBalance(client)
  assertNotEquals(balanceAfterFirstRephrase, initialBalance)
  
  const responseTwo = await client.functions.invoke('rephrase', {
    body: {
      text: 'different text to check idempotency - should return responseOne',
      style_id: TestStyleId,
      idempotency_key: idempotencyKey,
    },
  })
  assertSuccess(responseTwo)
  
  const balanceAfterSecondRephrase = await getUserBalance(client)
  assertEquals(balanceAfterSecondRephrase, balanceAfterFirstRephrase) // Balance should not change on idempotent request

  assertEquals(responseOne.data.rephrased, responseTwo.data.rephrased)
})

Deno.test('Rephrase User Error Idempotency', async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const idempotencyKey = crypto.randomUUID()
  
  const initialBalance = await getUserBalance(client)
  
  const responseOne = await client.functions.invoke('rephrase', {
    body: {
      text: 'USER_ERROR test',
      style_id: TestStyleId,
      idempotency_key: idempotencyKey,
    },
  })
  await assertError(responseOne.error, STATUS_CODE.UnprocessableEntity)
  
  const balanceAfterFirstRephrase = await getUserBalance(client)
  assertNotEquals(balanceAfterFirstRephrase, initialBalance) // still deducted - user caused it
  
  const responseTwo = await client.functions.invoke('rephrase', {
    body: {
      text: 'different text USER_ERROR',
      style_id: TestStyleId,
      idempotency_key: idempotencyKey,
    },
  })
  await assertError(responseTwo.error, STATUS_CODE.UnprocessableEntity)
  
  const balanceAfterSecondRephrase = await getUserBalance(client)
  assertEquals(balanceAfterSecondRephrase, balanceAfterFirstRephrase) // Balance should not change on idempotent request, even if user caused it
})

Deno.test('Rephrase Server Error Idempotency', async () => {
  const client = await SupabaseFixture({ authedUser: true, enabledStyle: true, fundUser: true })
  const idempotencyKey = crypto.randomUUID()
  
  const initialBalance = await getUserBalance(client)
  
  const responseOne = await client.functions.invoke('rephrase', {
    body: {
      text: 'SERVER_ERROR test',
      style_id: TestStyleId,
      idempotency_key: idempotencyKey,
    },
  })
  await assertError(responseOne.error, STATUS_CODE.InternalServerError)
  
  const balanceAfterFirstRephrase = await getUserBalance(client)
  assertEquals(balanceAfterFirstRephrase, initialBalance) // Server errors should not deduct balance
  
  const responseTwo = await client.functions.invoke('rephrase', {
    body: {
      text: 'different text SERVER_ERROR',
      style_id: TestStyleId,
      idempotency_key: idempotencyKey,
    },
  })
   
  // Server errors are NOT cached for idempotency, so should get another server error
  await assertError(responseTwo.error, STATUS_CODE.InternalServerError)
  
  const balanceAfterSecondRephrase = await getUserBalance(client)
  assertEquals(balanceAfterSecondRephrase, initialBalance) // Balance should still be unchanged
})
