# MandateX

MandateX is a demo control plane for x402 AI-agent payments. A founder creates a spending mandate for an agent, the backend stores the mandate as a Solana devnet Memo transaction, and every payment attempt is checked before an x402 payment is allowed to execute.

The core demo is intentionally simple:

```text
Rule -> Agent Attempt -> Decision
```

The founder allows `ResearchAgent_01` to pay `OpenWeather`. When the agent tries to pay `PremiumData`, MandateX blocks the request before the x402 payment clears.

## Features

- Founder-facing mandate UI with agent, vendor, per-call limit, and daily limit.
- Mandate enforcement checks for status, agent, vendor, per-call limit, and daily budget.
- Solana devnet mandate writes using Memo transactions.
- x402-protected vendor API for approved payments.
- Explicit live, partial, and mock source reporting for demo reliability.
- Revoke, reset, unauthorized, authorized, and overspend demo flows.
- Optional Inngest event endpoint for asynchronous payment attempts.

## Architecture

```text
frontend/  Next.js UI
    |
    v
backend/   FastAPI orchestration and mandate enforcement
    |----> Solana devnet Memo transaction for mandate proof
    |----> x402 client for approved payments
              |
              v
vendor/    Express x402 resource server
```

Important implementation notes:

- Mandate data is written to Solana as a Memo transaction. This project does not include a custom Anchor program.
- Enforcement runs in the FastAPI backend, not on-chain.
- `spent_today` and revoked status are kept in backend memory for the demo.
- Blocked payments do not call x402.
- External-service failures fall back to mock data, but the mandate checks still run.

## Repository Structure

```text
backend/
  api.py              FastAPI routes and orchestration
  mandate.py          Mandate enforcement checks
  solana_client.py    Solana Memo write path and in-memory mandate state
  x402_client.py      x402 payment client
  mock_data.py        Demo fallback data
  requirements.txt    Python dependencies

frontend/
  app/                Next.js App Router files
  components/         Mandate, payment, and audit panels
  package.json        Frontend scripts and dependencies

vendor/
  api/index.js        x402-protected Express resource server
  package.json        Vendor server scripts and dependencies

tools/
  build_gamma_docx.py Deck/document generation utility
```

## Prerequisites

- Node.js `>=18.17 <24` (`frontend/.nvmrc` uses Node 22)
- Python 3.10+
- A Solana devnet wallet for live mandate writes and x402 payments
- Devnet SOL and any required devnet payment token balance for live x402 execution

The app still runs without live Solana or x402 configuration by using mock fallback mode.

## Configuration

Create environment files from the examples, then adjust values for local development.

### Backend: `backend/.env`

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=
X402_VENDOR_URL=http://localhost:3000
X402_FACILITATOR_URL=https://www.x402.org/facilitator
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

`SOLANA_PRIVATE_KEY` should be a base58-encoded devnet private key. Leave it blank to run in mock mode.

### Frontend: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Vendor: `vendor/.env`

```env
SVM_PAY_TO=<devnet-recipient-wallet>
X402_FACILITATOR_URL=https://www.x402.org/facilitator
X402_NETWORK=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
```

`SVM_PAY_TO` is required by the vendor server.

## Local Development

Run the three services in separate terminals.

### 1. x402 Vendor API

```bash
cd vendor
npm install
cp .env.example .env
npm run dev
```

Vendor API: `http://localhost:3000`

### 2. FastAPI Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn api:app --reload --port 8000
```

Backend API: `http://localhost:8000`

On Windows PowerShell, activate the virtual environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Next.js Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend: `http://localhost:3001`

For local development, make sure `frontend/.env.local` points to `http://localhost:8000`.

## Demo Flow

1. Open `http://localhost:3001`.
2. Click `Create Mandate`.
3. Click `Trigger Unauthorized Vendor Attempt`.
4. Confirm the decision shows `BLOCKED BEFORE PAYMENT CLEARED`.
5. Click `Run Authorized Payment Test` to verify the approved x402 path.
6. Optional: run the overspend or revoke flows.
7. Click `Reset Demo` to restore the initial state.

## API Reference

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/mandate/get` | `GET` | Read the current mandate or mock fallback. |
| `/api/mandate/create` | `POST` | Create a mandate and write a Solana Memo transaction when configured. |
| `/api/payment/attempt` | `POST` | Run mandate checks and execute x402 only when approved. |
| `/api/payment/attempt-async` | `POST` | Enqueue a payment attempt through Inngest when configured. |
| `/api/mandate/revoke` | `POST` | Mark the active mandate as revoked in backend memory. |
| `/api/reset` | `POST` | Reset demo runtime state. |

Payment attempt request:

```json
{
  "agent_id": "ResearchAgent_01",
  "vendor_id": "OpenWeather",
  "amount": 1.0,
  "mandate_id": "mandate_001"
}
```

Standard response shape:

```json
{
  "success": true,
  "data": {},
  "source": "live | partial | mock",
  "reason": ""
}
```

## Source Modes

| Source | Meaning |
| --- | --- |
| `live` | Solana and x402 both completed successfully. |
| `partial` | One external dependency succeeded and one fell back to mock behavior. |
| `mock` | External dependencies were unavailable or unconfigured; demo fallback data was used. |

The source mode reports data quality only. Mandate enforcement is always performed by `backend/mandate.py`.

## Verification

Backend mandate check smoke test:

```bash
cd backend
python test_mandate.py
```

Frontend production build:

```bash
cd frontend
npm run build
```

Vendor service smoke test:

```bash
cd vendor
npm run dev
```

Then visit `http://localhost:3000` and `http://localhost:3000/premium`. The `/premium` endpoint is x402-protected and should require payment when configured.

## Security Notes

- Do not commit `.env`, `.env.local`, wallet keypairs, or private keys.
- Use devnet credentials only for this demo.
- The project is a prototype for mandate-backed payment control, not a production authorization system.
