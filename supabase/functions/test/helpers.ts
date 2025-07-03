import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { Client } from "jsr:@db/postgres";
import { assertEquals, assertExists } from 'jsr:@std/assert@1'


export const TestUserId = '00000000-0000-0000-0000-000000000001'
export const TestStyleId = '00000000-0000-0000-0000-000000000042'
const testUserEmail = 'pepethefrog@test.com'
const testUserPass = 'Test12345!'

export const SupabaseFixture = async (
  {
    authedUser = false,
    enabledStyle = false,
    fundUser = false,
  }: {
    authedUser?: boolean;
    enabledStyle?: boolean;
    fundUser?: boolean;
  },
): Promise<SupabaseClient> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  if (!supabaseUrl) throw new Error('supabaseUrl is required.')

  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!supabaseKey) throw new Error('supabaseKey is required.')

  const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? ''
  if (!dbUrl) throw new Error('dbUrl is required.')

  const dbClient = new Client(dbUrl)

  const sbClient: SupabaseClient = createClient(
    supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      }},
  )

  await createUser(dbClient)

  await createStyle(dbClient, enabledStyle)
  await fundUserBalance(dbClient, fundUser)

  if (authedUser) {
    await authUser(sbClient)
  }
  
  dbClient.end()

  return sbClient
}

const createUser = async (client: Client) => {
  await client.queryObject(`
INSERT INTO auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000', $1::uuid, 'authenticated', 'authenticated',
  $2::text, '$2a$10$WpVYngOQbCWySej82Bx23es840ogCBDCMvUSn1.w7Xa1XFA/L/KRK', now(), NULL, now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object(
    'sub', $1,
    'email', $2,
    'email_verified', 'true',
    'phone_verified', 'false'
  ),
  now(), now(), '', '', '', ''
)
ON CONFLICT DO NOTHING;
`, [TestUserId, testUserEmail])

  await client.queryObject(`
INSERT INTO auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002', $1::uuid, $1::uuid,
  jsonb_build_object(
    'sub', $1::text,
    'email', $2::text,
    'email_verified', 'true',
    'phone_verified', 'false'
  ),
  'email',
  now(), now(), now()
)
ON CONFLICT DO NOTHING;
`, [TestUserId, testUserEmail])
}

const authUser = async (client: SupabaseClient) => {
  const { error } = await client.auth.signInWithPassword({
    email: testUserEmail,
    password: testUserPass,
  })
  if (error) {
    throw new Error(`Test client login failed: ${error.message}`);
  }
}

const createStyle = async (client: Client, enabled: boolean) => {
  await client.queryObject(
    `INSERT INTO public.rephrase_styles (
      id, name, description, example_input, example_output,
      prompt, is_enabled
    ) VALUES (
     $1,
     'test',
     'Style to test the application',
     '', '',
     'Some prompt',
     $2
   ) ON CONFLICT (id) DO UPDATE SET is_enabled = $2`,
    [TestStyleId, enabled]
  )
}

const fundUserBalance = async (client: Client, fundUser: boolean) => {
  const balance = fundUser ? 100000 : 0
  await client.queryObject('UPDATE public.users SET balance = $1 WHERE user_id = $2', [balance, TestUserId])
}

export const getUserBalance = async (client: SupabaseClient): Promise<number> => {
  const { data, error } = await client
    .from('users')
    .select('balance')
    .eq('user_id', TestUserId)
    .single()

  if (error) throw error
  return data?.balance ?? 0
}

interface FunctionResponse<T = unknown> {
  data: T | null
  error: FunctionError | null
}

export const assertSuccess = <T>(response: FunctionResponse<T>, expectedData?: T) => {
  assertEquals(response.error, null)
  assertExists(response.data)
  
  if (expectedData) {
    assertEquals(response.data, expectedData)
  }
}

interface FunctionError {
  context: {
    status: number
    json(): Promise<unknown>
  }
}

export const assertError = async (
  error: FunctionError,
  expectedStatus: number,
  expectedMessage?: string,
) => {
  assertExists(error)
  assertEquals(error.context.status, expectedStatus)
  const responseBody = await error.context.json()
  if (expectedMessage) {
    if (responseBody && typeof responseBody === 'object' && 'reason' in responseBody) {
      assertEquals((responseBody as { reason: string }).reason, expectedMessage)
    } else {
      assertEquals(responseBody, expectedMessage)
    }
  }
}