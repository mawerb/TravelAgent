# Enterprise AI Travel Expense Agent — Design Spec

**Date:** 2026-08-13  
**Status:** Approved via user build prompt

## Goal

Ship a polished, deterministic demo for an AI-powered enterprise travel expense agent. Employees request travel in natural language; the system applies company policy, employee preferences, geospatial proximity, and price to recommend one strong itinerary, book with corporate TEST Stripe payment, record expenses, update the company ledger, and surface policy improvement insights.

## Core demo flow

1. Open dashboard (Alex Morgan / Acme Technologies).
2. Show Acme Travel Policy already imported from PDF.
3. Open Alex's travel profile.
4. Ask Travel Agent with MongoDB.local Las Vegas Sep 22–25 query.
5. Stream agent activity → one 96% recommended itinerary → book → TEST Visa 4242 → success → budget update → trips/expenses → insights policy suggestion.

## Hard rules

- Money, distance, policy, booking, and budget are deterministic.
- LLM only interprets language and writes explanations.
- Never trust client-sent prices.
- Stripe TEST MODE only (or mock with identical state machine).
- Company budget is a MongoDB ledger, not Stripe balance.
- Distance from `$near` / geo math, never from the model.
- `DEMO_MODE=true` freezes the Vegas script path.

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui, Lucide, Framer Motion, Recharts, MongoDB native driver, Stripe test SDK, OpenAI-compatible LLM adapter.

## Ponytail

Minimal files, native driver (no Mongoose), no auth product, agents as named functions in one module, mock adapters when credentials missing.
