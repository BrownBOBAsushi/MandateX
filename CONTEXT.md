# CONTEXT.md - MandateX
> Single source of truth for what this project is and why it exists.
> Read this before touching any code.
> Written for Claude Code and teammates joining mid-build.

---

## What This App Is

```
ONE-LINER:  This app helps a SaaS founder safely onboard to x402
            AI-agent payments by turning spending permission into
            a simple mandate UI, storing the mandate on Solana,
            and checking it before each payment can clear.

EVENT:      Solana Hackerhouse
TEAM:       Solo build
TIME:       ~19 hours total (Day 1: 13hrs, Day 2: 6hrs before demo freeze)
```

**Positioning:**

```
AP2 defines the mandate primitive.
x402 moves the money.
MandateX gives founders the control surface that makes agent payment permission
understandable, visible, and checkable before settlement.
```

Do not pitch this as inventing mandates. Pitch it as the founder-facing trust UX for x402 agent payments.

---

## The User

```
WHO:        A SaaS founder who has deployed an AI agent to pay for
            APIs autonomously but has no enforceable control over
            what it spends or where.

PROBLEM:    A misbehaving agent can spend beyond budget or pay the
            wrong vendor before anyone stops it.

CURRENT:    Prepaid credits, low-balance wallets, manual approvals,
            hardcoded backend limits: capping damage, not proving
            authorization.

OUR FIX:    Every agent payment must prove it matches a founder-set
            mandate before it clears.
```

---

## The One Demo Moment

> This is the single thing judges must remember.
> Every feature exists to serve this moment.
> If a feature does not serve this moment, it is already on the kill list.

```
Founder sets a mandate in 30 seconds ->
Agent attempts an unauthorized vendor payment ->
Blocked instantly ->
UI shows exactly why in one line: "Blocked: vendor not allowed by mandate"
```

The emotional beat is not "we processed a valid payment." The emotional beat is:

```
The founder allowed OpenWeather.
The agent tried PremiumData.
MandateX blocked it before payment cleared.
```

---

## UX North Star

The app should be understandable from one screen in 5 seconds.

```
Rule -> Agent Attempt -> Decision
```

Main screen layout:

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ 1. Spending Rule │ │ 2. Agent Attempt  │ │ 3. Decision       │
│ ResearchAgent_01 │ │ PremiumData       │ │ BLOCKED           │
│ can only pay     │ │ 1 USDC            │ │ before payment    │
│ OpenWeather      │ │                  │ │ cleared           │
│ Max: 2 USDC/call │ │ [Trigger Attempt] │ │ Vendor not allowed│
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

The UI should showcase:

```
1. Who can spend?
   ResearchAgent_01

2. Where can it spend?
   OpenWeather only

3. What happens when it tries something else?
   Blocked before x402 payment clears
```

---

## Core User Flow

```
Step 1: Founder opens app.
        The screen shows the 3-panel story:
        Spending Rule -> Agent Attempt -> Decision.

Step 2: Mandate card is pre-filled with seed defaults.
        Plain-English summary appears first:
        "ResearchAgent_01 can only pay OpenWeather up to 2 USDC per call."

Step 3: Founder hits Create Mandate. (15 seconds)

Step 4: Mandate is written to a Solana on-chain account.
        Success state shown. onchainAddress stored in frontend state.

Step 5: Founder clicks the primary CTA:
        "Trigger Unauthorized Vendor Attempt".

Step 6: Agent attempts payment to PremiumData, 1 USDC.
        POST /api/payment/attempt fires.

Step 7: Backend reads mandate from Solana.
        Runs 4 checks: agent -> vendor -> per-call limit -> daily budget.
        Vendor check fails.

Step 8: x402 payment is not executed.
        UI shows: "BLOCKED BEFORE PAYMENT CLEARED".
        Reason: "vendor not allowed by mandate".

Step 9: Proof panel shows:
        Mandate source: Solana account
        Decision: Blocked
        x402 payment: Not executed
```

Secondary sanity path:

```
Founder clicks "Run Authorized Payment Test" -> OpenWeather, 1 USDC.
Backend checks the mandate. All checks pass. x402 payment clears.
UI shows: "Approved - 1 USDC to OpenWeather".
```

The approved path proves the rail. It is not the main demo moment.

---

## Seed Data - Pre-loaded for Demo

```
Mandate ID:     mandate_001
Owner:          FounderWallet
Allowed agent:  ResearchAgent_01
Allowed vendor: OpenWeather
Per-call limit: 2 USDC
Daily limit:    5 USDC
Spent today:    0 USDC
Status:         active
```

This seed data must be pre-loaded as default form values and as backend mock fallback.

---

## The 4 Mandate Checks (in order)

```
1. Agent check       - is agent_id in mandate.agentPubkey?
2. Vendor check      - is vendor_id in mandate.allowedVendors?
3. Per-call limit    - is amount <= mandate.perCallLimit?
4. Daily budget      - is spentToday + amount <= mandate.dailyLimit?
```

First check that fails -> payment blocked. Reason returned. No further checks.
These checks ALWAYS run regardless of fallback mode. Never mock the enforcement logic.

---

## What We Are Building

### In Scope (v1 only)

```
- One-screen 3-panel story layout: Rule -> Agent Attempt -> Decision
- Mandate permission card shown in plain English
- Pre-filled mandate creation form, one vendor, one agent
- Mandate written to Solana on-chain account
- FastAPI backend with 4-check enforcement logic
- Primary unauthorized vendor attempt CTA
- Blocked hero result with one-line reason
- Proof panel showing mandate source + x402 not executed
- Secondary authorized payment test for x402 rail proof
- Demo reset button
- 🟢/🟡/🔴 data source badge
- Mock fallback for all external calls
```

### Explicitly Out of Scope

```
- Custom Anchor/Solana program: no Solana experience, kills Day 1
- Expiry check: same pattern, scoped out for demo clarity
- User auth / login: single founder demo
- Multi-agent or multi-vendor support: doubles complexity
- Autonomous agent script: button is identical, less risk
- Full audit page: proof panel only
- Wallet connect: fixed founder wallet for demo
- Real agent identity signing: agent_id string is sufficient
- Charts, analytics, landing page, email export: not core proof
- Raw JSON explorer UI: engineering detail, not demo story
```

Do not build anything on the out of scope list.
Do not suggest adding it back.

---

## Tech Stack

```
LAYER        CHOICE               WHY
Frontend     Next.js+TypeScript   Familiar, fast to ship, clean UI
Backend      Python + FastAPI     Familiar, fast API setup, async ready
Chain        Solana               Hackerhouse requirement
Storage      Solana account       On-chain mandate, tamper-evident record
Payment      x402 on Solana       Native agent payment rail
SDK          solana-py/solders    Python-native Solana RPC communication
Hosting      localhost            Hackathon demo, no deploy needed
```

---

## State Model

All shared state lives in `page.tsx` via React useState.
Child components receive state via props. They never mutate it directly.

```typescript
type DataSource = 'live' | 'partial' | 'mock'

type X402Status = 'executed' | 'not_executed' | 'mocked'

type PaymentAttempt = {
  vendor: string
  amount: number
  status: 'approved' | 'blocked'
  reason: string
  timestamp: string
  x402Status: X402Status
}

type Mandate = {
  mandateId: string | null
  ownerWallet: string | null
  agentPubkey: string | null
  allowedVendors: string[]
  perCallLimit: number | null
  dailyLimit: number | null
  spentToday: number
  status: 'inactive' | 'active' | 'revoked'
  onchainAddress: string | null
}

type AppState = {
  dataSource: DataSource   // always visible in UI badge
  mandate: Mandate
  payments: PaymentAttempt[]
  loadingStatus: 'idle' | 'loading' | 'success' | 'error'
}
```

---

## Module Ownership

```
frontend/page.tsx
  OWNS:     Demo orchestration and shared state
  DOES:     Holds state, calls backend APIs, passes props/callbacks to components
  DOES:     Keeps the main screen in Rule -> Agent Attempt -> Decision order
  DOES NOT: Enforce rules, write to Solana, execute payments

frontend/mandate.tsx
  OWNS:     Permission card + mandate creation form
  DOES:     Renders plain-English summary first
  DOES:     Renders pre-filled form, emits form data to parent on submit
  DOES NOT: Lead with raw IDs, write to Solana, enforce rules, call x402 directly

frontend/payments.tsx
  OWNS:     Agent attempt + decision display
  DOES:     Shows primary unauthorized CTA and secondary authorized CTA via callbacks
  DOES:     Shows live payment status and block reason per attempt
  DOES NOT: Fetch data directly, mutate state

frontend/audit.tsx
  OWNS:     Proof panel, not a full audit page
  DOES:     Renders compact proof: mandate source, decision, reason, x402 status
  DOES:     Can render a tiny event list if space allows
  DOES NOT: Fetch data, mutate state, become a dashboard

backend/api.py
  OWNS:     HTTP endpoints and request orchestration
  DOES:     Receives requests, coordinates solana_client.py + mandate.py + x402.py,
            returns unified response with source field
  DOES NOT: Contain authorization rules, render UI

backend/mandate.py
  OWNS:     Authorization logic, the 4 checks
  DOES:     Validates agent, vendor, amount, budget.
            Returns { approved: bool, reason: str }
  DOES NOT: Talk to Solana, execute x402, store state

backend/solana_client.py
  OWNS:     All Solana RPC communication
  DOES:     Writes mandate account, reads mandate account,
            returns mock data if RPC unreachable
  DOES NOT: Enforce rules, execute payments

backend/x402.py
  OWNS:     x402 payment execution
  DOES:     Triggers payment after mandate approval,
            returns mock confirmation if x402 unreachable
  DOES NOT: Check mandate rules, touch Solana
```

---

## API Endpoints

```
ENDPOINT                METHOD   PURPOSE                          MOCK FALLBACK
/api/mandate/create     POST     Write mandate to Solana,         Hardcoded mandate object
                                 return onchain address            with fake pubkey

/api/mandate/get        GET      Read mandate from Solana,        Return hardcoded
                                 return current state              mandate object

/api/payment/attempt    POST     Run 4 mandate checks,            Hardcoded approve/block
                                 execute x402 only if approved,    based on vendor string match
                                 return result + reason + source
```

**Request - /api/payment/attempt:**
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
  "reason": ""
}
```

Blocked payment responses must include:

```json
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

Rules:
- All API calls go through FastAPI backend only.
- Frontend never calls Solana or x402 directly.
- All API keys live in backend `.env` only, never in frontend.

---

## Failure Behavior

```
FAILURE                  VISIBLE SIGNAL                    FALLBACK
Solana RPC down          Badge -> 🟡 or 🔴                 Hardcoded mandate
x402 call fails          Badge -> 🟡                       Hardcoded approval
Mandate write fails      Toast: "Using demo mandate"       Mock mandate pre-loaded
Full network failure     Badge -> 🔴                       Full mock, checks still run

BADGE LOGIC:
🟢  live      real Solana + real x402
🟡  partial   one live source, one mocked source
🔴  mock      mocked Solana + mocked x402
```

The 4 mandate checks always run. Enforcement logic is never mocked.

Even in fallback mode, the blocked demo must still show:

```
BLOCKED BEFORE PAYMENT CLEARED
Reason: vendor not allowed by mandate
x402 payment: Not executed
```

---

## Design Reference

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

Status is communicated through:

```
1. Large text label: APPROVED or BLOCKED
2. Color: green or red
3. One-line reason sentence
4. Payment movement state: x402 executed or not executed
```

Do not rely on color alone.

---

## Key Decisions - Closed

```
- No custom Anchor/Solana program: off-chain enforcement with on-chain
  mandate storage. Decided Day 0. Do not reopen.

- Enforcement logic is in backend/mandate.py, not on-chain.
  The mandate DATA lives on Solana. The CHECKS run in Python.

- spentToday tracked in backend memory only, not written back on-chain.
  In-memory is sufficient for a 48hr demo.

- No user auth: single founder, fixed wallet, no login.

- Simulated payment via button, not an autonomous agent script.
  Protocol decision is identical regardless of request source.

- 4 checks only: agent, vendor, per-call limit, daily budget.
  Expiry is killed for v1.

- The unauthorized vendor block is the hero.
  The authorized payment path is secondary rail proof.
```

---

## What Good Looks Like

```
[ ] Core flow runs start to finish without breaking
[ ] Demo moment reachable within 60 seconds of opening app
[ ] A judge can understand Rule -> Attempt -> Decision in 5 seconds
[ ] Blocked card clearly says payment did not clear
[ ] Proof panel shows mandate source and x402 status
[ ] Mock fallback works if any API call is commented out
[ ] dataSource badge visible and accurate at all times
[ ] Full demo runs in under 3 minutes
[ ] Reset button restores demo state in one click
[ ] No console errors during demo run
[ ] Primary unauthorized attempt and secondary authorized test both work cleanly
```
