# MandateX — Build Progress

## Status: All 9 must-haves complete. All 4 stretches complete.

---

## Must-Haves

### Task 1 — x402 on Solana devnet via Coinbase facilitator ✅
- Ran `npm run coinbase:server` + `npm run coinbase:client` from `x402-solana-examples`
- Two transactions confirmed on Solana devnet:
  - `4TvKucXccHxVpP1HkVCtahBSbqYDoNLNfvs2E16xExgZVjy49s2ukjR5qZuZZk8Qq4hB3a89qeb8vV7zosGKFzbU`
  - `64f7ND61Zkwc39pkd5H4Pem3eVMVk1Ld4J6froovo2WbSBLpDgsbrPNnebAimBsWRQT2pKoftjYBwyNRkdzfjzTH`
- Created `backend/x402_client.py` — Python equivalent of `x402-demo-client.ts`
  - Uses `x402ClientSync` + `KeypairSigner.from_base58` + `register_exact_svm_client`
  - `x402.http.clients.requests.x402_requests` handles 402 → sign → retry loop
  - Falls back to mock if vendor server is unreachable
- Created `backend/requirements.txt` and `backend/.env.example`

### Task 2 — FastAPI skeleton + mock fallback ✅
- Created `backend/mock_data.py` with hardcoded MANDATE, APPROVED_PAYMENT, BLOCKED_PAYMENT
- Created `backend/api.py` with:
  - `POST /api/mandate/create` → returns mock mandate object
  - `POST /api/payment/attempt` → returns mock approved/blocked by vendor string match
  - All responses include `source: "live" | "partial" | "mock"`

### Task 3 — mandate.py: 4-check enforcement logic ✅
- Created `backend/mandate.py` with `check(agent_id, vendor_id, amount, mandate)`:
  1. Agent check
  2. Vendor check
  3. Per-call limit check
  4. Daily budget check
- First failing check returns immediately. Logic is non-negotiable.

### Task 4 — solana.py: write and read mandate account ✅
- Created `backend/solana_client.py` (renamed from solana.py to avoid package name conflict)
- `write_mandate`: sends mandate data as SPL Memo transaction on devnet
  - Tx signature becomes the `onchain_address` (visible on Solana explorer)
  - Falls back to mock address on RPC failure
- `read_mandate`: reads from in-memory `_store`, falls back to `mock_data.MANDATE`
- `update_spent`: increments `spent_today` in memory after approved payment
- `reset`: clears `spent_today` and restores `status: 'active'`

### Task 5 — Wire api.py to use real modules ✅
- `POST /api/mandate/create` → `solana_client.write_mandate()`
- `POST /api/payment/attempt` → `solana_client.read_mandate()` → `mandate_checks.check()` → `x402_client.pay()` only if approved
- Source field logic:
  - `live` = real Solana + real x402
  - `partial` = one mocked
  - `mock` = both mocked
- `POST /api/reset` → `solana_client.reset()`
- `GET /api/mandate/get` → `solana_client.read_mandate()`

### Task 6 — Next.js frontend: one-screen story + mandate permission card ✅
- Created full Next.js 14 project in `frontend/`
- 3-panel layout: Spending Rule | Agent Attempt | Decision
- `components/mandate.tsx` (Panel 1):
  - Plain-English summary first: "ResearchAgent_01 can only pay OpenWeather up to 2 USDC per call."
  - Pre-filled form with seed defaults
  - "Create Mandate" button → calls `POST /api/mandate/create`
  - Success state shows onchain address as small proof text

### Task 7 — Frontend: payment attempt buttons + hero decision display ✅
- Created `components/payments.tsx` (Panel 2):
  - Primary CTA: "Trigger Unauthorized Vendor Attempt" (PremiumData, 1 USDC)
  - Secondary: "Run Authorized Payment Test" (OpenWeather, 1 USDC)
  - Loading state, disabled until mandate is active
- Panel 3 (inline in page.tsx):
  - BLOCKED: large red "BLOCKED BEFORE PAYMENT CLEARED" + one-line reason + x402 status
  - APPROVED: large green "APPROVED" + amount + x402 status

### Task 8 — Proof panel, 🟢/🟡/🔴 badge, reset button ✅
- Created `components/audit.tsx` — proof panel below decision card:
  - Mandate source, Decision, Reason, x402 payment status
- Badge in header (always visible): 🟢 live / 🟡 partial / 🔴 mock
- Reset Demo button in header: clears payments, resets spentToday, restores seed state

### Task 9 — Demo hardening ✅
- `api.py`: global exception handler (no stack traces in responses)
- `api.py`: added `GET /api/mandate/get`
- Updated `.gitignore`: excludes `backend/.env`, `__pycache__`, `.next`, keypair files
- Wrote `README.md`: 3-terminal setup, env var instructions, demo flow, mock fallback table

---

## Stretches

### Stretch 1 — Revoke mandate ✅
- `mandate.py`: status check at top of `check()` — blocks all payments if revoked
- `solana_client.py`: `set_status(mandate_id, status)` updates in-memory store
- `api.py`: `POST /api/mandate/revoke` endpoint
- `mandate.tsx`: "Revoke Mandate" button (visible when active), status badge flips red

### Stretch 2 — Overspend block ✅
- `payments.tsx`: "Simulate Overspend — 6 USDC" button (orange)
- Sends OpenWeather, 6.0 USDC → fails check 3: "exceeds per-call limit"

### Stretch 3 — Compact event log ✅
- `audit.tsx`: history table below proof panel, appears after 2+ attempts
- Shows: status | vendor | amount | reason | timestamp
- Reads from `payments[]` state — no backend call

### Stretch 4 — Daily budget exhaustion ✅ (no new code)
- Already handled by existing `spent_today` accumulation in `solana_client.update_spent`
- Run authorized payment 5× → 6th attempt blocked: "daily budget exceeded"

---

## File Map

```
backend/
├── api.py             — FastAPI endpoints + orchestration
├── mandate.py         — 4-check enforcement logic (+ revoke check)
├── solana_client.py   — Solana RPC read/write + in-memory mandate store
├── x402_client.py     — x402 Python client (pay via Coinbase facilitator)
├── mock_data.py       — Hardcoded fallback data
├── requirements.txt   — Python deps
└── .env.example       — Env template

frontend/
├── app/
│   ├── page.tsx       — Demo orchestration + shared state + 3-panel layout
│   ├── layout.tsx     — Root layout
│   └── globals.css    — Dark theme + font variables
└── components/
    ├── mandate.tsx    — Panel 1: permission card + form + revoke button
    ├── payments.tsx   — Panel 2: payment CTAs (unauthorized, authorized, overspend)
    └── audit.tsx      — Panel 3 addition: proof panel + event log
```

---

## Key Decisions Made During Build

- `solana.py` → renamed to `solana_client.py` (avoids conflict with `solana` PyPI package)
- `x402.py` → renamed to `x402_client.py` (avoids circular import with `x402` PyPI package)
- Mandate storage: SPL Memo transaction (no custom Anchor program)
- `spent_today` tracked in backend memory only (not written back on-chain)
- TS demo server (`npm run coinbase:server`) acts as the vendor API for x402 payments
- Frontend on port 3001 (avoids conflict with TS demo server on port 3000)
