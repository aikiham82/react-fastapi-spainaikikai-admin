# Session: Dashboard Payments Card Fix

## Problem
- Dashboard shows "Pagos del Mes" (Monthly Payments) card with a count
- The only payments in the system are **annual payments** ("Pagos Anuales")
- Annual payments are assigned to members (not monthly)
- The "Pagos del Mes" card is misleading/incorrect

## Screenshots
- Dashboard shows: "Pagos del Mes" = 1, "2 pendientes"
- Annual payments page shows member assignment with license types (KYU, DAN, etc.)

## Investigation
- Need to check: What does the backend count for "Pagos del Mes"?
- Need to check: What should the dashboard show instead?
- Need to check: Where are payments viewed?

## Status: Exploring
