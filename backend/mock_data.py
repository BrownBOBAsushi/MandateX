MANDATE = {
    "mandate_id": "mandate_001",
    "owner_wallet": "FounderWallet",
    "agent_pubkey": "ResearchAgent_01",
    "allowed_vendors": ["OpenWeather"],
    "per_call_limit": 2.0,
    "daily_limit": 5.0,
    "spent_today": 0.0,
    "status": "active",
    "onchain_address": "DEMO_MOCK_ADDRESS_001",
}

APPROVED_PAYMENT = {
    "approved": True,
    "tx_hash": "DEMO_MOCK_TX_5xKp...xyz",
    "x402_status": "mocked",
}

BLOCKED_PAYMENT = {
    "approved": False,
    "x402_status": "not_executed",
}
