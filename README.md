# MandateX

Agent payment permission for x402 on Solana.

Founders set a spending mandate. Every AI agent payment must prove it matches
that mandate before x402 clears it. Unauthorized vendors are blocked before
any funds move.

---

## Run in 3 terminals

### Terminal 1 — x402 vendor server (acts as the vendor API)

```bash
cd x402-solana-examples
npm run coinbase:server
# http://localhost:3000
```

### Terminal 2 — Python backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set SOLANA_PRIVATE_KEY to the base58 secret key from client.json
uvicorn api:app --reload --port 8000
# http://localhost:8000
```

### Terminal 3 — Next.js frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
# http://localhost:3001
```

---

## Environment variables

**`backend/.env`**

```
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=          # base58 secret key — get from x402-solana-examples/pay-using-coinbase/client.json
X402_VENDOR_URL=http://localhost:3000
```

Extract SOLANA_PRIVATE_KEY from client.json:

```bash
cd x402-solana-examples
node -e "
const fs = require('fs'), bs58 = require('bs58');
const kp = JSON.parse(fs.readFileSync('./pay-using-coinbase/client.json'));
console.log(bs58.encode(Buffer.from(kp)));
"
```

**`frontend/.env.local`**

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Demo flow (under 3 minutes)

1. Open `http://localhost:3001`
2. Click **Create Mandate** — mandate written to Solana devnet (or mock fallback)
3. Click **Trigger Unauthorized Vendor Attempt** — `BLOCKED BEFORE PAYMENT CLEARED`
4. Click **Run Authorized Payment Test** — `APPROVED`, x402 executes
5. Click **Reset Demo** to restore state

The badge (top-right) shows data quality: 🟢 live / 🟡 partial / 🔴 mock.

---

## Mock fallback

The demo runs fully without any live services.

| Service down | Badge | Behavior |
|---|---|---|
| Solana RPC | 🟡 or 🔴 | Hardcoded mandate used |
| x402 vendor server | 🟡 | Mock tx hash returned |
| Both | 🔴 | Full mock, all 4 checks still run |

The 4 mandate checks always execute — enforcement is never mocked.

---

## Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind
- **Backend**: Python + FastAPI
- **Chain**: Solana devnet
- **Payment**: x402 via Coinbase facilitator
- **Storage**: Solana Memo transaction (mandate as on-chain record)
