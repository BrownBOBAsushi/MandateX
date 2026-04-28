"""Solana RPC read/write for mandate storage.

Demo strategy:
- Write mandate data as a Solana Memo transaction on devnet.
- The transaction signature becomes `onchain_address`.
- Runtime reads use in-memory `_store`, populated when mandate is created.
- If live Solana fails, fallback to mock_data.MANDATE.

Important:
This does NOT create a custom Solana account or Anchor program.
"""

import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

import mock_data


BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

_RPC_URL = os.getenv("SOLANA_RPC_URL", "https://api.devnet.solana.com")
_PRIVATE_KEY = os.getenv("SOLANA_PRIVATE_KEY", "").strip()

_MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

_store: dict = {}


def _debug_env() -> None:
    print("SOLANA ENV PATH:", ENV_PATH)
    print("SOLANA ENV EXISTS:", ENV_PATH.exists())
    print("SOLANA RPC:", _RPC_URL)
    print("HAS SOLANA PRIVATE KEY:", bool(_PRIVATE_KEY))
    print("SOLANA PRIVATE KEY LENGTH:", len(_PRIVATE_KEY))


_debug_env()


def _mock_write(mandate_id: str, stored: dict, reason: str) -> tuple[str, str]:
    print("SOLANA FALLBACK:", reason)
    stored["onchain_address"] = mock_data.MANDATE["onchain_address"]
    _store[mandate_id] = stored
    return mock_data.MANDATE["onchain_address"], "mock"


def _send_memo(memo_bytes: bytes) -> str:
    """Send a Solana Memo transaction. Returns tx signature string."""
    print("ATTEMPTING SOLANA MEMO WRITE")

    from solders.keypair import Keypair
    from solders.pubkey import Pubkey
    from solders.instruction import Instruction, AccountMeta
    from solders.message import Message
    from solders.transaction import Transaction
    from solana.rpc.api import Client
    from solana.rpc.types import TxOpts

    client = Client(_RPC_URL)

    keypair = Keypair.from_base58_string(_PRIVATE_KEY)
    print("SOLANA WRITER PUBKEY:", str(keypair.pubkey()))

    memo_program = Pubkey.from_string(_MEMO_PROGRAM)

    ix = Instruction(
        program_id=memo_program,
        accounts=[
            AccountMeta(
                pubkey=keypair.pubkey(),
                is_signer=True,
                is_writable=False,
            )
        ],
        data=memo_bytes,
    )

    latest = client.get_latest_blockhash()
    print("GET LATEST BLOCKHASH RESPONSE:", latest)

    blockhash = latest.value.blockhash

    msg = Message.new_with_blockhash(
        [ix],
        keypair.pubkey(),
        blockhash,
    )

    tx = Transaction.new_unsigned(msg)
    tx.sign([keypair], blockhash)

    response = client.send_transaction(
        tx,
        opts=TxOpts(skip_preflight=False),
    )

    print("SEND TRANSACTION RESPONSE:", response)

    if response.value is None:
        raise RuntimeError(f"Solana returned no transaction signature: {response}")

    return str(response.value)


def write_mandate(mandate_data: dict) -> tuple[str, str]:
    """Write mandate to Solana devnet. Returns (onchain_address, source)."""
    print("WRITE_MANDATE CALLED")

    mandate_id = mandate_data.get("mandate_id", "mandate_001")

    stored = {
        **mandate_data,
        "spent_today": 0.0,
        "status": "active",
    }

    if not _PRIVATE_KEY:
        return _mock_write(
            mandate_id,
            stored,
            "SOLANA_PRIVATE_KEY missing from backend/.env",
        )

    try:
        memo_payload = {
            "app": "MandateX",
            "mandate_id": mandate_data.get("mandate_id"),
            "agent": mandate_data.get("agent_pubkey"),
            "vendors": mandate_data.get("allowed_vendors"),
            "per_call": mandate_data.get("per_call_limit"),
            "daily": mandate_data.get("daily_limit"),
        }

        memo_bytes = json.dumps(
            memo_payload,
            separators=(",", ":"),
        ).encode("utf-8")

        print("MEMO PAYLOAD:", memo_payload)

        tx_sig = _send_memo(memo_bytes)

        stored["onchain_address"] = tx_sig
        _store[mandate_id] = stored

        print("SOLANA WRITE SUCCESS:", tx_sig)

        return tx_sig, "live"

    except Exception as e:
        print("SOLANA WRITE FAILED:", repr(e))
        return _mock_write(
            mandate_id,
            stored,
            f"live Solana write failed: {repr(e)}",
        )


def read_mandate(mandate_id: str) -> tuple[dict, str]:
    """Read mandate from memory. Falls back to mock_data if not written yet."""
    print("READ_MANDATE CALLED:", mandate_id)

    if mandate_id in _store:
        mandate = _store[mandate_id].copy()
        print("READ_MANDATE SOURCE: memory/live")
        return mandate, "live"

    print("READ_MANDATE SOURCE: mock fallback")
    return mock_data.MANDATE.copy(), "mock"


def update_spent(mandate_id: str, amount: float) -> None:
    """Increment spent_today in memory after an approved payment."""
    print("UPDATE_SPENT CALLED:", mandate_id, amount)

    if mandate_id in _store:
        _store[mandate_id]["spent_today"] = (
            _store[mandate_id].get("spent_today", 0.0) + amount
        )
        print("SPENT TODAY UPDATED:", _store[mandate_id]["spent_today"])
    else:
        print("UPDATE_SPENT SKIPPED: mandate not found in memory")


def reset(mandate_id: Optional[str] = None) -> None:
    """Reset spent_today to 0. Resets all mandates if mandate_id is None."""
    print("RESET CALLED:", mandate_id)

    targets = list(_store.keys()) if mandate_id is None else [mandate_id]

    for mid in targets:
        if mid in _store:
            _store[mid]["spent_today"] = 0.0
            print("RESET SPENT TODAY:", mid)
        else:
            print("RESET SKIPPED: mandate not found:", mid)
