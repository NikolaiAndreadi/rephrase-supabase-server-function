import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { Client } from "jsr:@db/postgres";

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
  if (fundUser) {
    await fundUserBalance(dbClient)
  }

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

const fundUserBalance = async (client: Client) => {
  await client.queryObject('UPDATE public.users SET balance = 10000 WHERE user_id = $1', [TestUserId])
}
