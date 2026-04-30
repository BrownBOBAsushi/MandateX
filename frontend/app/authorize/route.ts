import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CLIENT_ID = 'mandatex-docs'
const TOKEN = process.env.MCP_BEARER_TOKEN!

function randomCode(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri') || ''
  const state = searchParams.get('state') || ''
  const codeChallenge = searchParams.get('code_challenge') || ''
  const codeChallengeMethod = searchParams.get('code_challenge_method') || ''

  if (clientId !== CLIENT_ID) {
    return new NextResponse('Unknown client', { status: 400 })
  }
  if (codeChallengeMethod !== 'S256') {
    return new NextResponse('Only S256 supported', { status: 400 })
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>MandateX Docs — Authorize</title>
<style>
  body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f0f0f;color:#fff}
  .card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:2rem;max-width:400px;width:100%;text-align:center}
  h1{margin:0 0 .5rem;font-size:1.4rem}
  p{color:#aaa;margin:.5rem 0 1.5rem}
  button{background:#7c3aed;color:#fff;border:none;padding:.75rem 2rem;border-radius:8px;font-size:1rem;cursor:pointer;width:100%}
  button:hover{background:#6d28d9}
  .deny{background:transparent;border:1px solid #555;color:#aaa;margin-top:.75rem}
  .deny:hover{background:#1f1f1f}
</style>
</head>
<body>
<div class="card">
  <h1>MandateX Docs</h1>
  <p>Claude wants to access your project documentation. Enter your token to authorize.</p>
  <form method="POST">
    <input type="hidden" name="redirect_uri" value="${redirectUri}">
    <input type="hidden" name="state" value="${state}">
    <input type="hidden" name="code_challenge" value="${codeChallenge}">
    <input type="password" name="token" placeholder="Bearer token" required
      style="width:100%;box-sizing:border-box;padding:.75rem;border-radius:8px;border:1px solid #444;background:#111;color:#fff;font-size:1rem;margin-bottom:1rem">
    <button type="submit">Authorize</button>
    <button type="button" class="deny" onclick="window.location='${redirectUri}?error=access_denied&state=${state}'">Deny</button>
  </form>
</div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const token = formData.get('token') as string
  const redirectUri = formData.get('redirect_uri') as string
  const state = formData.get('state') as string
  const codeChallenge = formData.get('code_challenge') as string

  if (token !== TOKEN) {
    return new NextResponse('Invalid token', { status: 401 })
  }

  const code = randomCode()
  const { error } = await supabase.from('auth_codes').insert({
    code,
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  })

  if (error) {
    return new NextResponse('Failed to store auth code', { status: 500 })
  }

  const dest = new URL(redirectUri)
  dest.searchParams.set('code', code)
  if (state) dest.searchParams.set('state', state)

  return NextResponse.redirect(dest.toString())
}
