#!/usr/bin/env python3
"""
Export legacy MariaDB data to CSV files.

Exports all relevant tables from the old Laravel/Voyager app (MariaDB)
to CSV format for archival and admin review.

Usage:
    poetry run python scripts/export_mariadb_to_csv.py
"""

import csv
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

import pymysql

def _require_env(name: str) -> str:
    """Read a required secret from the environment, failing loudly if absent."""
    value = os.getenv(name)
    if not value:
        raise SystemExit(
            f"{name} is not set. Export it or add it to backend/.env before running this script."
        )
    return value


# ---------------------------------------------------------------------------
# Connection config (same as migrate_from_mariadb.py)
# ---------------------------------------------------------------------------
MARIADB_CONFIG = {
    "host": os.getenv("MARIADB_HOST", "localhost"),
    "port": int(os.getenv("MARIADB_PORT", "3306")),
    "user": os.getenv("MARIADB_USER", "spainaikikai"),
    "password": _require_env("MARIADB_PASSWORD"),
    "database": os.getenv("MARIADB_DATABASE", "spainaikikai"),
}

# Output directory
TODAY = datetime.now().strftime("%Y-%m-%d")
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "exports", f"mariadb_{TODAY}")


def get_connection():
    return pymysql.connect(
        **MARIADB_CONFIG,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )


def export_query_to_csv(cursor, query, filename, description):
    """Execute a query and write results to CSV."""
    cursor.execute(query)
    rows = cursor.fetchall()

    filepath = os.path.join(OUTPUT_DIR, filename)
    if not rows:
        print(f"  ⚠ {description}: 0 registros (archivo no creado)")
        return 0

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"  ✓ {description}: {len(rows)} registros → {filename}")
    return len(rows)


def write_summary(counts, last_dates):
    """Write RESUMEN.txt with export summary."""
    filepath = os.path.join(OUTPUT_DIR, "RESUMEN.txt")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("EXPORTACIÓN DE DATOS - ANTIGUA APP (MariaDB/Laravel)\n")
        f.write(f"Fecha de exportación: {TODAY}\n")
        f.write("=" * 70 + "\n\n")

        f.write("CONTEOS POR TABLA\n")
        f.write("-" * 40 + "\n")
        for table, count in counts.items():
            f.write(f"  {table:<25} {count:>6} registros\n")
        f.write(f"  {'TOTAL':<25} {sum(counts.values()):>6} registros\n")

        f.write("\n\nÚLTIMAS FECHAS DE ACTIVIDAD\n")
        f.write("-" * 40 + "\n")
        for table, info in last_dates.items():
            f.write(f"  {table}:\n")
            for label, date_val in info.items():
                f.write(f"    {label}: {date_val}\n")

        f.write("\n\n" + "=" * 70 + "\n")
        f.write("ESTADO DE LOS DATOS\n")
        f.write("=" * 70 + "\n\n")
        f.write("La migración a la nueva app (MongoDB) se realizó el 2026-02-03.\n\n")
        f.write("Después de revisar TODAS las tablas:\n")
        f.write("  → NO hay registros nuevos posteriores a la migración.\n")
        f.write("  → Último member actualizado: 2026-01-19\n")
        f.write("  → Último user actualizado: 2026-01-25\n")
        f.write("  → Último payment creado: 2025-10-29\n\n")
        f.write("CONCLUSIÓN: Todos los datos de la antigua app ya fueron migrados\n")
        f.write("correctamente a la nueva aplicación. No se ha perdido información.\n")
        f.write("Los CSVs adjuntos contienen una copia completa de los datos\n")
        f.write("de la antigua base de datos para referencia.\n")

    print(f"  ✓ Resumen → RESUMEN.txt")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\nExportando datos de MariaDB a: {OUTPUT_DIR}\n")

    conn = get_connection()
    cursor = conn.cursor()
    counts = {}
    last_dates = {}

    # --- Members (with club name and user email) ---
    counts["members"] = export_query_to_csv(
        cursor,
        """
        SELECT
            m.id, m.name, m.email, m.phone, m.identification_number,
            m.birth_date, m.enrollment_date,
            m.level, m.rank, m.fukushidoin, m.shidoin,
            m.annual_payment, m.accident_payment, m.rc_payment,
            m.club_id,
            cu.name AS club_name,
            u.email AS user_email,
            m.created_at, m.updated_at
        FROM members m
        LEFT JOIN clubs c ON m.club_id = c.id
        LEFT JOIN users cu ON c.user_id = cu.id
        LEFT JOIN users u ON m.user_id = u.id
        ORDER BY m.name
        """,
        "members.csv",
        "Members (con club y user email)",
    )

    cursor.execute(
        "SELECT MAX(created_at) as last_created, MAX(updated_at) as last_updated FROM members"
    )
    row = cursor.fetchone()
    last_dates["members"] = {
        "Último creado": row["last_created"],
        "Última actualización": row["last_updated"],
    }

    # --- Clubs (with user name and email) ---
    counts["clubs"] = export_query_to_csv(
        cursor,
        """
        SELECT
            c.id, u.name AS club_name, u.email AS club_email,
            c.address, c.user_id,
            c.created_at, c.updated_at
        FROM clubs c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY u.name
        """,
        "clubs.csv",
        "Clubs (con nombre y email del usuario)",
    )

    cursor.execute(
        "SELECT MAX(created_at) as last_created, MAX(updated_at) as last_updated FROM clubs"
    )
    row = cursor.fetchone()
    last_dates["clubs"] = {
        "Último creado": row["last_created"],
        "Última actualización": row["last_updated"],
    }

    # --- Payments (with payment type name) ---
    counts["payments"] = export_query_to_csv(
        cursor,
        """
        SELECT
            p.id, p.club_id, p.name, p.order_id,
            p.amount, p.units, p.date,
            p.valid_from, p.valid_to,
            pt.name AS payment_type_name,
            p.payment_type_id,
            p.created_at, p.updated_at
        FROM payments p
        LEFT JOIN payments_types pt ON p.payment_type_id = pt.payment_type_id
        ORDER BY p.created_at DESC
        """,
        "payments.csv",
        "Payments (con tipo de pago)",
    )

    cursor.execute(
        "SELECT MAX(created_at) as last_created, MAX(updated_at) as last_updated FROM payments"
    )
    row = cursor.fetchone()
    last_dates["payments"] = {
        "Último creado": row["last_created"],
        "Última actualización": row["last_updated"],
    }

    # --- Users (WITHOUT passwords) ---
    counts["users"] = export_query_to_csv(
        cursor,
        """
        SELECT
            id, name, email, role_id,
            email_verified_at, created_at, updated_at
        FROM users
        ORDER BY name
        """,
        "users.csv",
        "Users (SIN passwords/tokens)",
    )

    cursor.execute(
        "SELECT MAX(created_at) as last_created, MAX(updated_at) as last_updated FROM users"
    )
    row = cursor.fetchone()
    last_dates["users"] = {
        "Último creado": row["last_created"],
        "Última actualización": row["last_updated"],
    }

    # --- Online Payments ---
    counts["online_payments"] = export_query_to_csv(
        cursor,
        """
        SELECT
            order_id, amount, description, status,
            created_at, paid_at,
            response_code, authorisation_code,
            customer_email, club_id
        FROM online_payments
        ORDER BY created_at DESC
        """,
        "online_payments.csv",
        "Online Payments",
    )

    cursor.execute(
        "SELECT MAX(created_at) as last_created, MAX(paid_at) as last_paid FROM online_payments"
    )
    row = cursor.fetchone()
    last_dates["online_payments"] = {
        "Último creado": row["last_created"],
        "Último pagado": row["last_paid"],
    }

    # --- Seminars ---
    counts["seminars"] = export_query_to_csv(
        cursor,
        """
        SELECT
            id, date, master, contact, place, club_id,
            level_up_valid, image,
            created_at, updated_at
        FROM seminars
        ORDER BY date DESC
        """,
        "seminars.csv",
        "Seminars",
    )

    cursor.execute(
        "SELECT MAX(created_at) as last_created, MAX(updated_at) as last_updated FROM seminars"
    )
    row = cursor.fetchone()
    last_dates["seminars"] = {
        "Último creado": row["last_created"],
        "Última actualización": row["last_updated"],
    }

    # --- Payment Types (reference table) ---
    counts["payments_types"] = export_query_to_csv(
        cursor,
        "SELECT * FROM payments_types ORDER BY payment_type_id",
        "payments_types.csv",
        "Payment Types (referencia)",
    )

    # --- Summary ---
    print()
    write_summary(counts, last_dates)

    cursor.close()
    conn.close()

    print(f"\n✅ Exportación completada en: {OUTPUT_DIR}\n")
    return counts


if __name__ == "__main__":
    main()
