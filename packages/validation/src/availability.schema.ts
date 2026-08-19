import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createAvailabilityRuleSchema = z
  .object({
    staffId: z.string().min(1),
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, "Horário inválido (use HH:mm)"),
    endTime: z.string().regex(timeRegex, "Horário inválido (use HH:mm)"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "O horário final precisa ser depois do inicial.",
    path: ["endTime"],
  });

export const createAvailabilityExceptionSchema = z
  .object({
    staffId: z.string().min(1),
    type: z.enum(["BLOCK", "AVAILABLE"]),
    startsAt: z.iso.datetime({ local: true }),
    endsAt: z.iso.datetime({ local: true }),
    reason: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.startsAt < data.endsAt, {
    message: "O fim precisa ser depois do início.",
    path: ["endsAt"],
  });
