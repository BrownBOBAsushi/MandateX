# ARCHITECTURE.md - MandateX
> Locked. Do not reopen decisions marked as closed.

---

## Step 1 - App in One Sentence

```
This app helps a SaaS founder safely onboard to x402 AI-agent payments
by turning spending permission into a simple mandate UI, storing the mandate
on Solana, and checking it before each payment can clear.
```

**Positioning rule:**
MandateX is not claiming to invent mandates. AP2 defines the mandate primitive and x402 moves the money. MandateX is the founder-facing control surface that makes those ideas understandable and demoable in 30 seconds.

---

## Step 2 - Core Loop

The demo is a single trust story:

```
Rule -> Agent Attempt -> Decision
```

```
1. Founder opens app.
   The screen shows a 3-panel story layout:
   Spending Rule -> Agent Attempt -> Decision.

2. Mandate card is pre-filled with seed defaults.
   It is shown in plain English first:
   "ResearchAgent_01 can only pay OpenWeather up to 2 USDC per call."

3. Founder hits Create Mandate. (15 seconds)

4. Mandate is written to a Solana on-chain account.
   onchainAddress is returned and stored in frontend state.

5. Founder clicks the primary CTA:
   "Trigger Unauthorized Vendor Attempt".

6. Agent attempts payment:
   ResearchAgent_01 -> PremiumData -> 1 USDC.
   Frontend sends POST /api/payment/attempt to FastAPI backend.

7. Backend reads mandate from Solana.
   Runs 4 checks in order: agent -> vendor -> per-call limit -> daily budget.
   Fails check 2: vendor not in allowlist.

8. x402 payment is not executed.
   UI shows the hero decision card:
   "BLOCKED BEFORE PAYMENT CLEARED"
   Reason: "vendor not allowed by mandate".

9. Proof panel shows:
   Mandate source: Solana account
   Decision: Blocked
   x402 payment: Not executed
```

**Secondary sanity path:**
After the main demo moment works, the founder can click the secondary CTA:

```
"Run Authorized Payment Test" -> OpenWeather -> 1 USDC.
```

If this passes, x402 clears and the UI shows:

```
Approved - 1 USDC to OpenWeather
```

The approved path proves the payment rail. It is not the emotional center of the demo.

> This loop must be fully demo-able by end of Day 1 (Hour 8).
> If not working by Hour 8, freeze all stretch features immediately.

---

## Step 3 - Main Screen Showcase

The app should be understandable in 5 seconds from one screen.

```
┌─────────────────────────────────────────────────────────────┐
│ MandateX                                      🟢 Live / Mock │
│ Agent payment control for x402                               │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 1. Spending Rule │ │ 2. Agent Attempt  │ │ 3. Decision       │
│                  │ │                  │ │                  │
│ ResearchAgent_01 │ │ Wants to pay:     │ │ BLOCKED           │
│ can only pay     │ │ PremiumData       │ │ before payment    │
│ OpenWeather      │ │ 1 USDC            │ │ cleared           │
│                  │ │                  │ │                  │
│ Max: 2 USDC/call │ │ [Trigger Attempt] │ │ Vendor not allowed│
│ Daily: 5 USDC    │ │                  │ │ by mandate        │
└──────────────────┘ └──────────────────┘ └──────────────────┘

Proof: Mandate read from Solana account | x402 payment not executed
```

**UX rules:**

```
- Lead with plain English, not raw IDs.
- Unauthorized vendor attempt is the primary CTA.
- Approved payment is a secondary sanity test.
- The blocked decision card is the largest visual element after the attempt.
- Every blocked result must explicitly say: "Blocked before payment cleared".
- The proof panel must show: Solana mandate source + x402 not executed.
```

**Do not showcase by default:**

```
- mandate_id
- owner_wallet
- raw API JSON
- daily budget math
- mock fallback internals
- backend module structure
- full event history
```

These are engineering details. The judge should first see the trust story.

---

## Step 4 - State Model

```javascript
const state = {
  // Always visible in UI, never hidden
  dataSource: 'live',          // 'live' | 'partial' | 'mock'
                               // 🟢 live: real Solana + real x402
                               // 🟡 partial: one live, one mocked
                               // 🔴 mock: mocked Solana + mocked x402

  // Mandate
  mandate: {
    mandateId: null,           // string, e.g. "mandate_001"
    ownerWallet: null,         // string, founder wallet pubkey (fixed for demo)
    agentPubkey: null,         // string, e.g. "ResearchAgent_01"
    allowedVendors: [],        // string[], e.g. ["OpenWeather"]
    perCallLimit: null,        // number, max USDC per payment, e.g. 2
    dailyLimit: null,          // number, max USDC per day, e.g. 5
    spentToday: 0,             // number, tracked in backend memory, not on-chain
    status: 'inactive',        // 'active' | 'inactive' | 'revoked'
    onchainAddress: null,      // string, Solana account address after creation
  },

  // Payment attempts log
  payments: [],                // array of:
                               // { vendor, amount, status, reason, timestamp, x402Status }
                               // status: 'approved' | 'blocked'
                               // x402Status: 'executed' | 'not_executed' | 'mocked'

  // Async
  loadingStatus: 'idle',       // 'idle' | 'loading' | 'success' | 'error'
}
```

**State rules, non-negotiable:**
1. Only `page.tsx` mutates shared state via useState/props.
2. Child components read via props, never write directly.
3. Every API response updates `dataSource` so the badge is always accurate.
4. No new state fields without adding them here first.

---

## Step 5 - Module Map

```
frontend/page.tsx
  OWNS:     Demo orchestration and shared state
  DOES:     Holds state, calls backend APIs, passes props/callbacks to components
  DOES:     Keeps the screen in the Rule -> Agent Attempt -> Decision flow
  DOES NOT: Enforce rules, write to Solana, execute payments

frontend/mandate.tsx
  OWNS:     Permission card + mandate creation form
  DOES:     Renders plain-English mandate summary first
  DOES:     Renders pre-filled form, emits form data to parent on submit
  DOES NOT: Lead with raw crypto IDs, write to Solana, enforce rules, call x402

frontend/payments.tsx
  OWNS:     Agent attempt + decision display
  DOES:     Shows primary unauthorized vendor attempt CTA via callback props
  DOES:     Shows secondary authorized payment test CTA via callback props
  DOES:     Shows live payment status and one-line block reason per attempt
  DOES NOT: Fetch data, call backend directly, mutate state

frontend/audit.tsx
  OWNS:     Proof panel, not a full audit page
  DOES:     Renders compact proof: mandate source, decision, reason, x402 status
  DOES:     Can render a tiny event list if space allows
  DOES NOT: Fetch data, mutate state, become a dashboard

backend/api.py
  OWNS:     HTTP endpoints and request orchestration
  DOES:     Creates mandates, receives payment attempts,
            coordinates solana_client.py + mandate.py + x402.py calls,
            returns unified response with source field
  DOES NOT: Contain authorization rules, render UI

backend/mandate.py
  OWNS:     Authorization logic, the 4 checks
  DOES:     Checks agent identity, vendor allowlist, per-call limit,
            daily budget. Returns { approved: bool, reason: str }
  DOES NOT: Talk to Solana, execute x402, store state

backend/solana_client.py
  OWNS:     All Solana communication
  DOES:     Writes mandate record to Solana account,
            reads mandate record from Solana account,
            returns mock data if RPC unreachable
  DOES NOT: Enforce rules, execute payments

backend/x402.py
  OWNS:     x402 payment execution
  DOES:     Triggers payment after mandate approval,
            returns mock confirmation if x402 unreachable
  DOES NOT: Check mandate rules, touch Solana
```

---

## Step 6 - API Boundary

```
All external API calls go through backend only.
Frontend never calls Solana or x402 directly.
All API keys live in .env, never in frontend code.

ENDPOINT                METHOD   PURPOSE                           MOCK FALLBACK
/api/mandate/create     POST     Write mandate to Solana,          Hardcoded mandate object
                                 return onchain address             with fake pubkey

/api/mandate/get        GET      Read mandate from Solana,         Return hardcoded
                                 return current state               mandate object

/api/payment/attempt    POST     Run 4 mandate checks,             Hardcoded approve/block
                                 execute x402 only if approved,     based on vendor name match
                                 return result + reason + source
```

**Request body for /api/payment/attempt:**
```json
{
  "agent_id": "ResearchAgent_01",
  "vendor_id": "OpenWeather",
  "amount": 1.0,
  "mandate_id": "mandate_001"
}
```

**Response shape, all endpoints:**
```json
{
  "success": true,
  "data": {},
  "source": "live | partial | mock",
  "reason": "vendor not allowed by mandate"
}
```

**Blocked payment response must include:**
```json
{
  "data": {
    "approved": false,
    "x402_status": "not_executed"
  },
  "reason": "vendor not allowed by mandate"
}
```

---

## Step 7 - Failure Behavior

```
FAILURE SCENARIO        VISIBLE SIGNAL                     FALLBACK BEHAVIOR
Solana RPC down         Badge turns 🟡 or 🔴               Return hardcoded mandate
x402 call fails         Badge turns 🟡                     Return hardcoded approval
Mandate write fails     Toast: "Using demo mandate"        Pre-loaded mock mandate
Full network failure    Badge turns 🔴                     Full mock, all 4 checks still run

BADGE LOGIC:
🟢  live      real Solana + real x402
🟡  partial   one live source, one mocked source
🔴  mock      mocked Solana + mocked x402
```

**Critical rule:** the 4 mandate checks always run regardless of fallback mode.
Enforcement logic is never mocked. Only data source and payment execution are mocked.

**UX rule:** fallback must not obscure the demo moment. Even in mock mode, the blocked card must still say:

```
BLOCKED BEFORE PAYMENT CLEARED
Reason: vendor not allowed by mandate
x402 payment: Not executed
```

---

## Step 8 - Tech Stack Decision Log

```
LAYER        CHOICE               WHY                                   REJECTED
Frontend     Next.js+TypeScript   Familiar, fast to ship, clean UI      React alone: no routing
Backend      Python + FastAPI     Familiar, fast API, async ready        Flask: less structure
Chain        Solana               Hackerhouse requirement                Hedera: wrong event
Storage      Solana account       On-chain mandate, tamper-evident       Database: not on-chain
Payment      x402 on Solana       Native agent payment rail             Manual transfer: no standard
SDK          solana-py/solders    Python-native Solana communication    JS SDK: wrong backend lang
Hosting      localhost            Hackathon demo, no deploy needed       Vercel: unnecessary
```

---

## Step 9 - Design Rules

```
APP NAME:         MandateX
PRIMARY BG:       #0A0A0A (near black)
SURFACE:          #111111 / #1A1A1A (card backgrounds)
ACCENT PRIMARY:   #9945FF (Solana purple)
ACCENT SUCCESS:   #14F195 (Solana green)
ACCENT DANGER:    #FF4444 (blocked/error red)
ACCENT WARNING:   #F5A623 (yellow for partial badge)
FONT DISPLAY:     Syne or DM Mono (bold headers)
FONT BODY:        Inter or IBM Plex Mono
UI STYLE:         Dark. Minimal. Apple-level whitespace.
                  Solana gradient accents on key moments only.
                  No clutter. No decorative elements.
```

Status must be communicated through:

```
1. Large text label: APPROVED or BLOCKED
2. Color: green or red
3. One-line reason sentence
4. Payment movement state: x402 executed or not executed
```

Do not rely on color alone.

---

## Step 10 - Scope Freeze Rule

```
Once the core loop from Step 2 is demo-able, SCOPE IS FROZEN.

No new features.
No quick additions.
No pivots.
Polish and fallback hardening only.

Exception: a Solana dev at the hackerhouse suggests something
that takes under 15 minutes and does not touch existing working code.
```

---

## Post-Hackathon Review

```
Did the core loop work end-to-end during the demo?    Y / N
Could judges understand Rule -> Attempt -> Decision in 5 seconds?    Y / N
Did the blocked decision card clearly say payment did not clear?    Y / N
What state field caused the most bugs?
->
Which module had unclear ownership?
->
What would you add to the state model earlier?
->
What API failure caught you off guard?
->
```
