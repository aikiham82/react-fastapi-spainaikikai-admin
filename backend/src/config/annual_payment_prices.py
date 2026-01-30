"""Annual payment pricing configuration."""

from typing import Dict

# Prices in EUR
ANNUAL_PAYMENT_PRICES: Dict[str, float] = {
    "club_fee": 100.0,
    "kyu": 15.0,
    "kyu_infantil": 5.0,
    "dan": 20.0,
    "fukushidoin_shidoin": 70.0,
    "seguro_accidentes": 15.0,
    "seguro_rc": 35.0,
}

# Price labels for display
ANNUAL_PAYMENT_LABELS: Dict[str, str] = {
    "club_fee": "Cuota de Club",
    "kyu": "Licencia KYU (adulto)",
    "kyu_infantil": "Licencia KYU Infantil (≤14 años)",
    "dan": "Licencia DAN",
    "fukushidoin_shidoin": "FUKUSHIDOIN/SHIDOIN (incluye RC + DAN)",
    "seguro_accidentes": "Seguro de Accidentes",
    "seguro_rc": "Seguro RC",
}
