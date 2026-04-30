import { NextRequest, NextResponse } from 'next/server'

function base(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'xmandatex.vercel.app'
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return `${proto}://${host}`
}

export async function GET(req: NextRequest) {
  const b = base(req)
  return NextResponse.json({
    issuer: b,
    authorization_endpoint: `${b}/authorize`,
    token_endpoint: `${b}/api/token`,
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    response_types_supported: ['code'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
  })
}
