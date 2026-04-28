def check(agent_id: str, vendor_id: str, amount: float, mandate: dict) -> dict:
    if agent_id != mandate["agent_pubkey"]:
        return {"approved": False, "reason": "agent not authorized by mandate"}

    if vendor_id not in mandate["allowed_vendors"]:
        return {"approved": False, "reason": "vendor not allowed by mandate"}

    if amount > mandate["per_call_limit"]:
        return {"approved": False, "reason": "exceeds per-call limit"}

    if mandate["spent_today"] + amount > mandate["daily_limit"]:
        return {"approved": False, "reason": "daily budget exceeded"}

    return {"approved": True, "reason": ""}
