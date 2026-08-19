import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional(),
  timezone: z.string().trim().min(1).default("America/Sao_Paulo"),
});

export const updateCompanySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional(),
  timezone: z.string().trim().min(1),
  addressLine1: z.string().trim().max(180).optional(),
  addressLine2: z.string().trim().max(180).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(20).optional(),
});
