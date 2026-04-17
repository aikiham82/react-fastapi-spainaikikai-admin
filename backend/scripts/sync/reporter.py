"""Render ActionPlan as JSON report + stdout summary."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from .planner import ActionPlan


def write_report(plan: ActionPlan, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"sync_report_{date.today().isoformat()}.json"
    path = out_dir / filename
    payload = {
        "summary": summary(plan),
        "club_inserts": plan.club_inserts,
        "member_updates": plan.member_updates,
        "member_inserts": [_strip_correlation(d) for d in plan.member_inserts],
        "license_upserts": plan.license_upserts,
        "insurance_upserts": plan.insurance_upserts,
        "payment_upserts": plan.payment_upserts,
        "skipped": plan.skipped,
        "warnings": plan.warnings,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
    return path


def summary(plan: ActionPlan) -> dict[str, int]:
    return {
        "club_inserts": len(plan.club_inserts),
        "member_updates": len(plan.member_updates),
        "member_inserts": len(plan.member_inserts),
        "license_upserts": len(plan.license_upserts),
        "insurance_upserts": len(plan.insurance_upserts),
        "payment_upserts": len(plan.payment_upserts),
        "skipped": len(plan.skipped),
        "warnings": len(plan.warnings),
    }


def print_summary(plan: ActionPlan) -> None:
    s = summary(plan)
    print("=" * 60)
    print("SYNC PLAN SUMMARY")
    print("=" * 60)
    for k, v in s.items():
        print(f"  {k:25s} {v:>6d}")
    print("=" * 60)
    if plan.skipped:
        print("\nSKIPPED (first 10):")
        for s_row in plan.skipped[:10]:
            print(
                f"  #{s_row['num_socio']} {s_row['name']} — {s_row['reason']}"
            )
    if plan.warnings:
        print(f"\nWARNINGS: {len(plan.warnings)} (first 5)")
        for w in plan.warnings[:5]:
            print(f"  {w}")


def _strip_correlation(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if not k.startswith("__")}
