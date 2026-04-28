import mandate

m = {
    "agent_pubkey": "ResearchAgent_01",
    "allowed_vendors": ["OpenWeather"],
    "per_call_limit": 2.0,
    "daily_limit": 5.0,
    "spent_today": 0.0,
}

print("1. Should approve:")
print(mandate.check("ResearchAgent_01", "OpenWeather", 1.0, m))

print("\n2. Should block wrong agent:")
print(mandate.check("BadAgent", "OpenWeather", 1.0, m))

print("\n3. Should block wrong vendor:")
print(mandate.check("ResearchAgent_01", "PremiumData", 1.0, m))

print("\n4. Should block over per-call limit:")
print(mandate.check("ResearchAgent_01", "OpenWeather", 3.0, m))

print("\n5. Should block over daily budget:")
print(mandate.check("ResearchAgent_01", "OpenWeather", 1.0, {**m, "spent_today": 5.0}))