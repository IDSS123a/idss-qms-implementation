import { z } from 'zod'

export const documentStatusSchema = z.enum(['draft', 'in_review', 'approved', 'obsolete'])
export const taskStatusSchema = z.enum(['open', 'in_progress', 'blocked', 'completed', 'cancelled'])
export const prioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

export const documentInputSchema = z.object({
  title: z.string().trim().min(3).max(240),
  code: z.string().trim().min(2).max(80),
  type: z.string().trim().min(2).max(80),
  status: documentStatusSchema.default('draft'),
  content: z.string().max(200_000).default(''),
})

export const taskInputSchema = z.object({
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().max(5_000).optional(),
  dueDate: z.coerce.date(),
  priority: prioritySchema.default('medium'),
  documentId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
})

export const approvalInputSchema = z.object({
  versionId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(2_000).optional(),
})

export function validationError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join('.') || 'zahtjev'}: ${issue.message}`).join('; ')
}

export type DocumentInput = z.infer<typeof documentInputSchema>
export type TaskInput = z.infer<typeof taskInputSchema>
export type ApprovalInput = z.infer<typeof approvalInputSchema>

export const qmsDocumentStatuses = documentStatusSchema.options
export const qmsTaskStatuses = taskStatusSchema.options
export const qmsPriorities = prioritySchema.options
