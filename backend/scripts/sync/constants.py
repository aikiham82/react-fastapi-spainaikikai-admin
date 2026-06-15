# backend/scripts/sync/constants.py
"""Known mappings and defaults for the Excel-to-prod sync."""

# Excel has ~9 TAIO rows with wrong club_id (6c6b = Roseraie España).
# Correct TAIO club_id is 6c86.
TAIO_REMAP = {
    ("TAIO", "6985f6004dca105b754e6c6b"): "6985f6004dca105b754e6c86",
}

# Excel sheet names we actually consume.
SHEET_MEMBERS = "MIEMBROS APP CON NOMBRE CLUB"
SHEET_FEES = "2026 SIN SUMA CUOTAS"
SHEET_INSURANCES = "Seguro de accidentes APP"
SHEET_MASTER = "2026"

# Target MongoDB collections.
COLL_MEMBERS = "members"
COLL_LICENSES = "licenses"
COLL_INSURANCES = "insurances"
COLL_PAYMENTS = "member_payments"
COLL_CLUBS = "clubs"

# Defaults for fees when Excel Seguro RC == "RC" (price taken from price_configurations
# in prod if available; this is the fallback).
DEFAULT_SEGURO_RC_AMOUNT = 10

# Standard fee amounts used to resolve TEXT-LABEL cells. The secretary sometimes types
# a label (e.g. "Cuota An." / "Seg. Acc.") in the amount column instead of the number;
# those cells must resolve to the standard amount, not 0.
DEFAULT_SEGURO_ACCIDENTES_AMOUNT = 15  # constant across all rows in the Excel
DEFAULT_CUOTA_KYU_AMOUNT = 15  # kyu annual license fee (dan cuotas vary; never labeled)

# Lowercased label texts that mean "the standard amount applies for this column".
CUOTA_LABELS = {"cuota an.", "cuota anual", "cuota an", "cuota"}
SEGURO_ACC_LABELS = {"seg. acc.", "seguro accidentes", "seguro de accidentes", "seg acc"}

# Club fee (cuota_club) charged per club per year. Matches price_configurations.club_fee.
DEFAULT_CLUB_FEE_AMOUNT = 100

# License expiration for season 2026.
LICENSE_YEAR = 2026
SEASON_START_ISO = "2026-01-01T00:00:00Z"
SEASON_END_ISO = "2026-12-31T23:59:59Z"
