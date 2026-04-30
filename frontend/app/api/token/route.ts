import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TOKEN = process.env.MCP_BEARER_TOKEN!

async function sha256b64url(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function POST(req: NextRequest) {
  let params: URLSearchParams

  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await req.json()
    params = new URLSearchParams(body)
  } else {
    const text = await req.text()
    params = new URLSearchParams(text)
  }

  const grantType = params.get('grant_type')
  const code = params.get('code')
  const codeVerifier = params.get('code_verifier')
  const redirectUri = params.get('redirect_uri')

  if (grantType !== 'authorization_code' || !code || !codeVerifier) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('auth_codes')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
  }

  // Clean up stale codes (older than 10 minutes)
  await supabase
    .from('auth_codes')
    .delete()
    .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())

  const challenge = await sha256b64url(codeVerifier)
  if (challenge !== row.code_challenge) {
    return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
  }

  await supabase.from('auth_codes').delete().eq('code', code)

  return NextResponse.json({
    access_token: TOKEN,
    token_type: 'Bearer',
    expires_in: 3600,
  })
}
