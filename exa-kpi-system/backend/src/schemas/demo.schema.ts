import { z } from "zod";

export const createDemoSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});

export type CreateDemoDto = z.infer<typeof createDemoSchema>;
