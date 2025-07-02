import { assertEquals } from 'jsr:@std/assert@1'
import { SupabaseFixture, TestStyleId } from "./helpers.ts";

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
  console.log(JSON.stringify(func_data, null, 2))
  assertEquals(func_data.rephrased, 'rephrased Fake global prompt.\n\nSome prompt\n\nInput text: hellow')
}

Deno.test('Rephrase Success Function Test', testHappyCase)