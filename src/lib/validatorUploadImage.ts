import { z } from "zod";

export const validatorUploadImageSchema = z.object({
  success: z.boolean(),
  bank: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().default("BRL"),
  recipientName: z.string().nullable(),
  recipientKey: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  message: z.string(),
});

export type ValidatorUploadImage = z.infer<typeof validatorUploadImageSchema>;

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
