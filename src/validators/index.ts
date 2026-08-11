import { z } from 'zod';

export const commonPaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type CommonPagination = z.infer<typeof commonPaginationSchema>;
