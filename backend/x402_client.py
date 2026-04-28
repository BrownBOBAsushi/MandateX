"""x402 payment execution via Coinbase facilitator on Solana devnet."""

import json
import os
import base64
from dotenv import load_dotenv

load_dotenv()

_PRIVATE_KEY = os.getenv("SOLANA_PRIVATE_KEY", "")
_VENDOR_URL = os.getenv("X402_VENDOR_URL", "http://localhost:3000")

_MOCK_RESULT = {
    "tx_hash": "MOCK_TX_5xKp_DEMO",
    "x402_status": "mocked",
}


def _build_client():
    from x402 import x402ClientSync
    from x402.mechanisms.svm.signers import KeypairSigner
    from x402.mechanisms.svm.exact.register import register_exact_svm_client

    signer = KeypairSigner.from_base58(_PRIVATE_KEY)
    client = x402ClientSync()
    register_exact_svm_client(client, signer, rpc_url=os.getenv("SOLANA_RPC_URL"))
    return client


def _parse_tx_hash(response) -> str:
    raw = response.headers.get("x-payment-response", "")
    if not raw:
        return ""
    try:
        decoded = json.loads(base64.b64decode(raw).decode("utf-8"))
        return decoded.get("transaction", "")
    except Exception:
        return ""


def pay(vendor_id: str, amount: float) -> dict:
    """
    Execute an x402 payment for an approved mandate request.
    Returns {"tx_hash": str, "x402_status": "executed" | "mocked"}.
    Falls back to mock on any failure so the badge -> partial.
    """
    if not _PRIVATE_KEY:
        return _MOCK_RESULT

    try:
        from x402.http.clients.requests import x402_requests

        client = _build_client()
        session = x402_requests(client)

        # The TS demo server (npm run coinbase:server) acts as the vendor API.
        response = session.get(f"{_VENDOR_URL}/premium", timeout=15)
        response.raise_for_status()

        tx_hash = _parse_tx_hash(response)
        return {
            "tx_hash": tx_hash or "TX_HASH_MISSING",
            "x402_status": "executed",
        }

    except Exception:
        return _MOCK_RESULT
