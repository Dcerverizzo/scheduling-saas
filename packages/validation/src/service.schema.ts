import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(240).default(0),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(240).default(0),
  price: z.string().trim().min(1),
  staffIds: z.array(z.string()).default([]),
});

export const updateServiceSchema = createServiceSchema;
