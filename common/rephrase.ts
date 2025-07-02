import { z } from 'zod';

export const RephraseRequestSchema = z
  .object({
    text: z.string().min(3).max(2000),
    style_id: z.string().uuid(),
    idempotency_key: z.string().uuid(),
  })
  .strict();

export const RephraseResponseSchema = z.object({
  rephrased: z.string().min(1),
});

export const RephraseErrorResponseSchema = z.object({
  reason: z.string().min(1),
  issues: z.array(
    z.object({
      path: z.string().min(1),
      message: z.string().min(1),
    })
  ).optional(),
});

export type RephraseRequest = z.infer<typeof RephraseRequestSchema>;
export type RephraseResponse = z.infer<typeof RephraseResponseSchema>;
export type RephraseErrorResponse = z.infer<typeof RephraseErrorResponseSchema>;
