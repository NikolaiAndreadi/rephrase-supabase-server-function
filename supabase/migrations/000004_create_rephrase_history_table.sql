CREATE TYPE rephrase_status AS ENUM (
    'REPHRASED',       -- successful rephrase
    'FAILED',          -- server error, do not deduct money from user
    'BAD_USER_REQUEST' -- user asks something forbidden, deduct money from user
);


CREATE TABLE public.rephrase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    status rephrase_status NOT NULL,

    input_text TEXT NOT NULL,
    cost INT NOT NULL CHECK (cost >= 0),
    style_id UUID REFERENCES public.rephrase_styles(id) NOT NULL,
    output_text TEXT,
    error_message TEXT,

    idempotency_key UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    prompt TEXT NOT NULL,
    model VARCHAR(32) NOT NULL,
    model_input_tokens INT NOT NULL CHECK (model_input_tokens >= 0),
    model_output_tokens INT NOT NULL CHECK (model_output_tokens >= 0),
    error_message_internal TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.rephrase_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX token_history_user_id_idempotency_key_idx
ON public.rephrase_history(user_id, idempotency_key);

CREATE POLICY "Users can read own rephrase data" ON public.rephrase_history
FOR SELECT USING ((SELECT auth.uid()) = user_id);

GRANT SELECT (
    id,
    status,
    input_text,
    cost,
    style_id,
    output_text,
    error_message
)
ON TABLE public.rephrase_history TO authenticated;
