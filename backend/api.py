import logging
import os
from typing import List

import inngest
import inngest.fast_api
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import mandate as mandate_checks
import mock_data
import solana_client
import x402_client


app = FastAPI()
INNGEST_ENABLED = bool(os.getenv("INNGEST_DEV") or os.getenv("INNGEST_SIGNING_KEY"))
inngest_client = inngest.Inngest(
    app_id="mandatex-backend",
    logger=logging.getLogger("uvicorn"),
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": {},
            "source": "mock",
            "reason": "Internal server error. Check backend logs.",
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://mandatex-desmond-chyes-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MandateCreateRequest(BaseModel):
    mandate_id: str
    owner_wallet: str
    agent_pubkey: str
    allowed_vendors: List[str]
    per_call_limit: float
    daily_limit: float


class PaymentAttemptRequest(BaseModel):
    agent_id: str
    vendor_id: str
    amount: float
    mandate_id: str


class MandateRevokeRequest(BaseModel):
    mandate_id: str


def process_payment_attempt(req: PaymentAttemptRequest) -> dict:
    mandate, solana_source = solana_client.read_mandate(req.mandate_id)
    result = mandate_checks.check(req.agent_id, req.vendor_id, req.amount, mandate)

    if not result["approved"]:
        source = solana_source
        return {
            "success": True,
            "data": {"approved": False, "x402_status": "not_executed"},
            "source": source,
            "reason": result["reason"],
        }

    payment = x402_client.pay(req.vendor_id, req.amount)
    x402_status = payment["x402_status"]

    if x402_status == "executed":
        solana_client.update_spent(req.mandate_id, req.amount)

    if solana_source == "live" and x402_status == "executed":
        source = "live"
    elif solana_source == "mock" and x402_status == "mocked":
        source = "mock"
    else:
        source = "partial"

    return {
        "success": True,
        "data": {
            "approved": True,
            "tx_hash": payment["tx_hash"],
            "x402_status": x402_status,
            "vendor_url": payment.get("vendor_url", ""),
        },
        "source": source,
        "reason": "",
    }


@inngest_client.create_function(
    fn_id="process-payment-attempt",
    trigger=inngest.TriggerEvent(event="mandatex/payment.attempt"),
)
async def process_payment_attempt_event(ctx: inngest.Context) -> dict:
    req = PaymentAttemptRequest(**ctx.event.data)
    return process_payment_attempt(req)


if INNGEST_ENABLED:
    inngest.fast_api.serve(app, inngest_client, [process_payment_attempt_event])


@app.get("/api/mandate/get")
def get_mandate(mandate_id: str = "mandate_001"):
    mandate, source = solana_client.read_mandate(mandate_id)
    return {
        "success": True,
        "data": mandate,
        "source": source,
        "reason": "",
    }


@app.post("/api/mandate/create")
def create_mandate(req: MandateCreateRequest):
    mandate_data = req.model_dump()
    onchain_address, source = solana_client.write_mandate(mandate_data)

    return {
        "success": True,
        "data": {
            "mandate_id": req.mandate_id,
            "onchain_address": onchain_address,
            "status": "active",
        },
        "source": source,
        "reason": "" if source == "live" else "Solana write fell back to mock; check backend logs",
    }


@app.post("/api/payment/attempt")
def payment_attempt(req: PaymentAttemptRequest):
    return process_payment_attempt(req)


@app.post("/api/payment/attempt-async")
async def payment_attempt_async(req: PaymentAttemptRequest):
    if not INNGEST_ENABLED:
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "data": {},
                "source": "inngest",
                "reason": "Set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY to enable async payment attempts.",
            },
        )

    ids = await inngest_client.send(
        inngest.Event(
            name="mandatex/payment.attempt",
            data=req.model_dump(),
        )
    )
    return {
        "success": True,
        "data": {"event_ids": ids},
        "source": "inngest",
        "reason": "",
    }


@app.post("/api/mandate/revoke")
def revoke_mandate(req: MandateRevokeRequest):
    solana_client.set_status(req.mandate_id, "revoked")
    return {
        "success": True,
        "data": {"mandate_id": req.mandate_id, "status": "revoked"},
        "source": "mock",
        "reason": "",
    }


@app.post("/api/reset")
def reset():
    solana_client.reset()
    return {"success": True, "data": {}, "source": "mock", "reason": ""}
