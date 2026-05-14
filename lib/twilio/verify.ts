import 'server-only'

export interface TwilioVerifyError extends Error {
  status?: number
  code?: string
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !verifyServiceSid) {
    const error = new Error('Twilio Verify is not configured.') as TwilioVerifyError
    error.code = 'misconfigured'
    throw error
  }

  return { accountSid, authToken, verifyServiceSid }
}

async function twilioVerifyRequest(
  path: string,
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  const { accountSid, authToken } = getTwilioConfig()
  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const response = await fetch(`https://verify.twilio.com/v2/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${authHeader}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(
      typeof payload?.message === 'string' ? payload.message : 'Twilio Verify request failed.',
    ) as TwilioVerifyError
    error.status = response.status
    error.code = typeof payload?.code === 'number' ? String(payload.code) : undefined
    throw error
  }

  return payload
}

export async function sendTwilioVerificationCode(phoneNumber: string): Promise<void> {
  const { verifyServiceSid } = getTwilioConfig()
  await twilioVerifyRequest(
    `Services/${verifyServiceSid}/Verifications`,
    new URLSearchParams({
      To: phoneNumber,
      Channel: 'sms',
    }),
  )
}

export async function checkTwilioVerificationCode(
  phoneNumber: string,
  code: string,
): Promise<'approved' | 'pending' | 'canceled' | 'max_attempts_reached'> {
  const { verifyServiceSid } = getTwilioConfig()
  const payload = await twilioVerifyRequest(
    `Services/${verifyServiceSid}/VerificationCheck`,
    new URLSearchParams({
      To: phoneNumber,
      Code: code,
    }),
  )

  const status = payload.status
  if (
    status === 'approved' ||
    status === 'pending' ||
    status === 'canceled' ||
    status === 'max_attempts_reached'
  ) {
    return status
  }

  return 'pending'
}
