import { HAS_SENTRY } from '@constants/env-constants'
import { env } from '@env/index'
import { INTERNAL_SERVER_ERROR } from '@messages/responses/common-responses/5xx'
import * as Sentry from '@sentry/bun'
import { getBusinessError } from '@services/error-handlers/get-business-error'

export function initSentry() {
  if (!HAS_SENTRY) return

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 1.0,
    release: env.SENTRY_RELEASE,

    beforeSend: (event, hint) => {
      const error = hint.originalException as Error

      if (getBusinessError(error) !== INTERNAL_SERVER_ERROR) {
        return null
      }

      return event
    },
  })
}
