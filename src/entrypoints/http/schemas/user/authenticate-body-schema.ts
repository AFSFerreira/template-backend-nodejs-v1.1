import { limitedNonemptyTextSchema } from '@lib/zod/utils/primitives/limited-nonempty-text-schema'
import { z } from 'zod'

export const authenticateBodySchema = z.object({
  login: limitedNonemptyTextSchema,
  password: limitedNonemptyTextSchema,
})
