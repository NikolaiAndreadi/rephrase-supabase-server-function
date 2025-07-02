CREATE TABLE public.rephrase_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) NOT NULL,
    description VARCHAR(128) NOT NULL,
    example_input TEXT NOT NULL,
    example_output TEXT NOT NULL,

    is_enabled BOOLEAN DEFAULT false NOT NULL,
    prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.rephrase_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read enabled styles" ON public.rephrase_styles
FOR SELECT USING (is_enabled = true);

GRANT SELECT (
    id,
    name,
    description,
    example_input,
    example_output
)
ON TABLE public.rephrase_styles TO anon, authenticated;
