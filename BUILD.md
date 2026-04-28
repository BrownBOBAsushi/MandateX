# BUILD.md - MandateX
> This file tells you exactly what to build, in what order, and what not to touch.
> Read CONTEXT.md first for the full product picture.
> Written for Claude Code. Feed this file as context before any code generation.

---

## Get Running in 5 Minutes

```bash
# 1. Clone the repo
git clone [repo url]
cd mandatex

# 2. Set up backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in API keys in .env

# 3. Start backend
uvicorn api:app --reload --port 8000
# Backend running at http://localhost:8000

# 4. Set up frontend (new terminal)
cd ../frontend
npm install
cp .env.local.example .env.local

# 5. Start frontend
npm run dev
# Frontend running at http://localhost:3000
```

---

## Project Structure

```
mandatex/
├── frontend/
│   ├── app/
│   │   └── page.tsx          # Demo orchestration + shared state
│   ├── components/
│   │   ├── mandate.tsx        # Permission card + mandate creation form
│   │   ├── payments.tsx       # Agent attempt + decision display
│   │   └── audit.tsx          # Proof panel, not a full audit page
│   ├── .env.local.example     # Frontend env template
│   └── package.json
│
├── backend/
│   ├── api.py                 # FastAPI endpoints + orchestration
│   ├── mandate.py             # 4-check authorization logic
│   ├── solana_client.py       # Solana RPC read/write
│   ├── x402.py                # x402 payment execution
│   ├── mock_data.py           # All hardcoded fallback data
│   ├── requirements.txt
│   ├── .env                   # API keys, never commit
│   └── .env.example           # Template, commit this
│
├── CONTEXT.md                 # What and why, read first
└── BUILD.md                   # How to build, you are here
```

---

## Environment Variables

```bash
# backend/.env, never commit this file

SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=           # Base58 encoded private key for mandate writes
                              # Generate with: solana-keygen new --outfile wallet.json

# Coinbase x402 facilitator, no API key required for devnet
# Facilitator URL for Solana devnet:
X402_FACILITATOR_URL=https://facilitator.coinbase.com

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## UX Showcase Requirements

The UI is not a backend control panel. It is a one-screen trust story.

Build the main screen around this:

```
Rule -> Agent Attempt -> Decision
```

Must-have UX details:

```
[ ] Main screen uses 3-panel story layout:
    Spending Rule -> Agent Attempt -> Decision

[ ] Mandate is shown in plain English before raw form fields:
    "ResearchAgent_01 can only pay OpenWeather up to 2 USDC per call."

[ ] Unauthorized vendor attempt is the primary CTA.

[ ] Authorized OpenWeather payment is secondary, used only to prove the x402 rail.

[ ] Blocked result card is the largest visual element after the attempt.

[ ] Blocked result explicitly says:
    "BLOCKED BEFORE PAYMENT CLEARED"

[ ] Blocked reason appears in one line:
    "Blocked: vendor not allowed by mandate"

[ ] Proof panel shows:
    Mandate source: Solana account
    Decision: Blocked
    x402 payment: Not executed

[ ] Data source badge stays top-right and visible, but does not compete with the hero result.
```

Do not lead the UI with these:

```
- mandate_id
- owner_wallet
- raw API JSON
- daily budget math
- mock fallback internals
- backend module structure
- full event history
```

These can exist in small text or proof details. They are not the story.

---

## What To Build - In This Order

Do not skip ahead. Do not start a new task until the previous one works.

### MUST HAVE - build these first, in this order

```
[ ] Task 1 - x402 on Solana devnet via Coinbase facilitator
      Reference: https://github.com/Woody4618/x402-solana-examples
      Use the pay-using-coinbase example, NOT pay-in-usdc or pay-in-sol.
      Why: Coinbase facilitator handles on-chain verification for you.
      Your x402.py only needs one HTTP call to the facilitator. No node needed.

      Steps to prove the rail works:
        git clone https://github.com/Woody4618/x402-solana-examples
        cd x402-solana-examples
        npm install
        # Terminal 1: npm run coinbase:server
        # Terminal 2: npm run coinbase:client

      After it runs: read pay-using-coinbase/client.ts and server.ts carefully.
      This TypeScript code is your x402.py reference implementation.

      How x402.py works after this:
        1. Receive approved payment request from mandate.py
        2. POST payment payload to Coinbase facilitator endpoint
        3. Facilitator verifies on Solana, returns tx confirmation
        4. Return tx_hash to api.py
        5. On facilitator failure -> return mock confirmation, badge -> 🟡

      DONE WHEN: One transaction confirmed via Coinbase facilitator on devnet.
                 You can explain the client.ts payment flow in one sentence.

[ ] Task 2 - FastAPI skeleton + mock fallback
      Create api.py with two endpoints:
        POST /api/mandate/create -> returns hardcoded mandate object
        POST /api/payment/attempt -> returns hardcoded approved or blocked response
      Create mock_data.py with all hardcoded fallback data.
      Responses must include source: "live" | "partial" | "mock".
      Blocked responses must include x402_status: "not_executed".
      DONE WHEN: Both endpoints return 200 with mock data via curl.

[ ] Task 3 - mandate.py: 4-check enforcement logic
      Implement the 4 checks in order:
        1. agent_id matches mandate.agentPubkey
        2. vendor_id in mandate.allowedVendors
        3. amount <= mandate.perCallLimit
        4. spentToday + amount <= mandate.dailyLimit
      Return { approved: bool, reason: str }
      First failing check returns immediately. No further checks.
      DONE WHEN: Returns correct approved/blocked for all 4 scenarios.

[ ] Task 4 - solana_client.py: write and read mandate account
      Write mandate to Solana devnet account on create.
      Read mandate from Solana account on payment attempt.
      Return mock_data.MANDATE if RPC unreachable.
      Update source field in response accordingly:
        live    = real Solana + real x402
        partial = one external source mocked
        mock    = both external sources mocked
      DONE WHEN: Mandate account visible on devnet explorer.

[ ] Task 5 - Wire api.py to use real modules
      /api/mandate/create -> solana_client.py.write_mandate()
      /api/payment/attempt -> solana_client.py.read_mandate()
                           -> mandate.py.check()
                           -> x402.py.pay() only if approved
      If mandate.py blocks the payment, x402.py must not be called.
      Return { success, data, source, reason } on all paths.
      DONE WHEN: Full backend flow works via curl with real Solana data.

[ ] Task 6 - Next.js frontend: one-screen story + mandate permission card
      Build a 3-panel layout:
        1. Spending Rule
        2. Agent Attempt
        3. Decision

      Pre-fill mandate with seed data defaults:
        Agent:    ResearchAgent_01
        Vendor:   OpenWeather
        Per-call: 2 USDC
        Daily:    5 USDC

      Show plain-English summary above the form:
        "ResearchAgent_01 can only pay OpenWeather up to 2 USDC per call."

      Submit calls POST /api/mandate/create.
      Show success state after creation.
      Show onchainAddress as small proof text, not the hero.
      DONE WHEN: Founder can create mandate in under 30 seconds.

[ ] Task 7 - Frontend: payment attempt buttons + hero decision display
      Two buttons:
        Primary:   "Trigger Unauthorized Vendor Attempt"
        Secondary: "Run Authorized Payment Test"

      Primary button sends:
        vendor_id = "PremiumData"
        amount = 1.0

      Secondary button sends:
        vendor_id = "OpenWeather"
        amount = 1.0

      Each calls POST /api/payment/attempt via page.tsx only.
      Show loading state while waiting.

      Blocked result card:
        Large label: "BLOCKED BEFORE PAYMENT CLEARED"
        One-line reason: "Blocked: vendor not allowed by mandate"
        Attempted: ResearchAgent_01 -> PremiumData -> 1 USDC
        Allowed: ResearchAgent_01 -> OpenWeather only
        x402 payment: Not executed

      Approved result card:
        Large label: "APPROVED"
        Message: "Approved - 1 USDC to OpenWeather"
        x402 payment: Executed or mocked, based on source

      DONE WHEN: Blocked case is visually obvious and authorized case still works.

[ ] Task 8 - Frontend: proof panel, 🟢/🟡/🔴 badge, reset button
      Badge in top-right corner, always visible:
        🟢 source === 'live'    (real Solana + real x402)
        🟡 source === 'partial' (one mocked)
        🔴 source === 'mock'    (both mocked)

      Proof panel below decision card shows:
        Mandate source: Solana account or demo fallback
        Decision: Approved or Blocked
        Reason: one-line reason
        x402 payment: Executed / Not executed / Mocked

      Reset button:
        Clears payments[]
        Resets spentToday to 0
        Restores default visual demo state

      DONE WHEN: Badge updates correctly, proof panel is readable, reset restores demo state.

[ ] Task 9 - Demo hardening
      Comment out Solana call -> mock fallback activates, badge goes 🟡/🔴.
      Comment out x402 call -> mock fallback activates, badge updates.
      All error messages human-readable, no stack traces in UI.
      No console errors during full demo run.
      .env.example and README with run commands written.
      Full demo path must start with unauthorized block, not approved payment.
      DONE WHEN: Full demo runs × 3, timed, under 3 minutes, no breaks.
```

### STRETCH - only if all must-haves done and 90+ minutes remain

```
[ ] Stretch 1 - Pause/revoke mandate
      Add Pause/Revoke button to mandate panel.
      Updates mandate.status to 'revoked' in backend state.
      Next payment attempt blocked: "Blocked: mandate revoked"
      Highest judge impact. Build this first.

[ ] Stretch 2 - Overspend block
      Add third demo button: "Simulate Agent Payment - 6 USDC"
      Fails check 3: exceeds per-call limit (2 USDC max)
      Shows: "Blocked: exceeds per-call limit"

[ ] Stretch 3 - Proof panel tiny event list
      Compact list below proof panel.
      Each row: timestamp | agent | vendor | amount | decision | reason
      Read from payments[] state. No backend call needed.
      Do not turn this into a full audit page.

[ ] Stretch 4 - Daily budget exhaustion
      Multiple approved payments accumulate spentToday in backend.
      Final payment blocked: "Blocked: daily budget exceeded"
      Lowest priority. Cut if time is tight.
```

---

## What NOT To Build

These are explicitly cut. Claude Code must not build or suggest these.

```
- Custom Anchor/Solana program
- Expiry check (v1)
- User auth or login
- Multi-agent or multi-vendor support
- Autonomous agent script
- Full audit page (proof panel only, not a page)
- Wallet connect
- Real agent identity signing
- Charts or analytics
- Beautiful landing page
- Email or export features
- Mobile responsive layout
- Payment retry logic
- Mandate templates
- Raw JSON explorer UI
- Enterprise compliance workflow
- Anything AP2 or x402 V2 already does deeply, such as full VDC signing or wallet session systems
```

If Claude Code suggests any of these, reject it. Do not add it.

---

## API Reference

### POST /api/mandate/create

```json
// Request
{
  "mandate_id": "mandate_001",
  "owner_wallet": "FounderWallet",
  "agent_pubkey": "ResearchAgent_01",
  "allowed_vendors": ["OpenWeather"],
  "per_call_limit": 2.0,
  "daily_limit": 5.0
}

// Response
{
  "success": true,
  "data": {
    "mandate_id": "mandate_001",
    "onchain_address": "7xKp...abc",
    "status": "active"
  },
  "source": "live | partial | mock",
  "reason": ""
}
```

### POST /api/payment/attempt

```json
// Request
{
  "agent_id": "ResearchAgent_01",
  "vendor_id": "OpenWeather",
  "amount": 1.0,
  "mandate_id": "mandate_001"
}

// Response, approved
{
  "success": true,
  "data": {
    "approved": true,
    "tx_hash": "5xKp...xyz",
    "x402_status": "executed"
  },
  "source": "live | partial | mock",
  "reason": ""
}

// Response, blocked
{
  "success": true,
  "data": {
    "approved": false,
    "x402_status": "not_executed"
  },
  "source": "live | partial | mock",
  "reason": "vendor not allowed by mandate"
}
```

---

## Mock Fallback Data - mock_data.py

```python
# backend/mock_data.py
# These are returned when Solana RPC or x402 is unreachable.
# Do not change these during the demo.

MANDATE = {
    "mandate_id": "mandate_001",
    "owner_wallet": "FounderWallet",
    "agent_pubkey": "ResearchAgent_01",
    "allowed_vendors": ["OpenWeather"],
    "per_call_limit": 2.0,
    "daily_limit": 5.0,
    "spent_today": 0.0,
    "status": "active",
    "onchain_address": "DEMO_MOCK_ADDRESS_001"
}

APPROVED_PAYMENT = {
    "approved": True,
    "tx_hash": "DEMO_MOCK_TX_5xKp...xyz",
    "x402_status": "mocked"
}

BLOCKED_PAYMENT = {
    "approved": False,
    "x402_status": "not_executed"
}
```

---

## The 4 Checks - mandate.py

```python
# backend/mandate.py

def check(agent_id: str, vendor_id: str, amount: float, mandate: dict) -> dict:
    # Check 1: Agent
    if agent_id != mandate["agent_pubkey"]:
        return { "approved": False, "reason": "agent not authorized by mandate" }

    # Check 2: Vendor
    if vendor_id not in mandate["allowed_vendors"]:
        return { "approved": False, "reason": "vendor not allowed by mandate" }

    # Check 3: Per-call limit
    if amount > mandate["per_call_limit"]:
        return { "approved": False, "reason": "exceeds per-call limit" }

    # Check 4: Daily budget
    if mandate["spent_today"] + amount > mandate["daily_limit"]:
        return { "approved": False, "reason": "daily budget exceeded" }

    return { "approved": True, "reason": "" }
```

This logic is non-negotiable. Do not modify check order. Do not add checks without updating CONTEXT.md first.

---

## State Rules - Non-Negotiable

```typescript
// CORRECT: read from props in child components
const { mandate, payments } = props

// CORRECT: update state in page.tsx only
setMandate({ ...mandate, status: 'active' })
setPayments([...payments, newPayment])

// CORRECT: child component can emit an event upward
onUnauthorizedAttempt()

// WRONG: never mutate state in child components
mandate.status = 'active' // ❌

// WRONG: never call backend from child components
fetch('/api/payment/attempt', ...) // ❌, only in page.tsx
```

---

## Visual Acceptance Test

Before calling the frontend done, stand 2 meters away from the screen and answer:

```
[ ] Can I see the spending rule?
[ ] Can I see what the agent tried to do?
[ ] Can I see that the payment was blocked before clearing?
[ ] Can I read the reason in one line?
[ ] Can I tell whether the app is live, partial, or mock mode?
```

If any answer is no, the UI is still too engineering-led.

---

## How To Test Before Marking Done

Before checking off any must-have task:

```
[ ] Works with live API data
[ ] Works with mock data (comment out the real API call to verify)
[ ] No console errors
[ ] State updates correctly after the action
[ ] dataSource badge reflects correct live/partial/mock status
[ ] Full demo flow still works end to end after this change
[ ] Blocked path still says x402 payment was not executed
```

The last two checks are the most important.
If your change breaks the demo flow, fix that before anything else.

---

## Common Issues

```
PROBLEM                              FIX
Solana RPC returning 429             Switch RPC in .env to https://rpc.ankr.com/solana_devnet
Coinbase facilitator returning 400   Check payment payload shape matches client.ts reference
Coinbase facilitator returning 401   Devnet should not need auth, check facilitator URL
CORS error on frontend               All calls go through FastAPI only, never direct
Badge not updating                   Ensure source field returned on every API response
Mock not loading                     Check mock_data.py is imported in api.py
spentToday not resetting             Reset button must POST to /api/reset or reload state
Blocked card missing x402 status     Ensure blocked response includes x402_status: "not_executed"
devnet USDC balance empty            Use Solana devnet faucet + Circle devnet USDC faucet
```

---

## Demo Checklist - Run Before Presenting

```
[ ] Backend running: uvicorn api:app --reload --port 8000
[ ] Frontend running: npm run dev on localhost:3000
[ ] dataSource badge visible in top-right corner
[ ] Main screen shows Rule -> Agent Attempt -> Decision
[ ] Mandate card is pre-filled with seed data
[ ] Plain-English mandate summary is visible
[ ] Create mandate -> success state shows
[ ] Primary unauthorized attempt -> red blocked card with one-line reason
[ ] Blocked card says: "BLOCKED BEFORE PAYMENT CLEARED"
[ ] Proof panel says: x402 payment not executed
[ ] Secondary authorized payment -> green approved card
[ ] Reset button restores demo state
[ ] Mock fallback works (comment out Solana call, re-run demo)
[ ] No console errors
[ ] Full demo timed under 3 minutes
[ ] Verbal pitch practiced out loud at least once
```

---

## Scope Freeze Rule

Once the core loop is working and demo-able, scope is frozen.

No new features. No quick additions. No pivots.

If Claude Code suggests something new:
1. Is it on the MUST HAVE list? Then it is already being built.
2. Is it on the STRETCH list? Only after all must-haves are done.
3. Is it on neither list? Reject it and add it to the kill list.

The demo is in [X] hours. Protect the core loop.
