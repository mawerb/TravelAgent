# Acme Travel Expense Agent

Enterprise AI travel expense demo for Acme Technologies.

**Tell us where you need to go. We handle policy, preferences, proximity, price, and booking.**

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- MongoDB (native driver) with geospatial `$near` and vector-similarity abstraction
- Stripe TEST MODE (or mock adapter)
- Framer Motion + Recharts

## Quick start

```bash
cp .env.example .env.local
npm install
npm run seed   # optional if DEMO_MODE auto-seeds
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable | Notes |
|---|---|
| `DEMO_MODE=true` | Deterministic Vegas demo path + mock adapters |
| `MONGODB_URI` | Atlas or local Mongo. If unreachable in DEMO_MODE, an in-process MongoMemoryServer is used |
| `STRIPE_SECRET_KEY` | Optional `sk_test_...`. Otherwise mock Stripe |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | Optional. Otherwise demo LLM adapter |

## Demo script

1. Home → Alex / Acme
2. Company Policy → Active PDF rules
3. Profile → Travel DNA (91%)
4. Ask Travel Agent → MongoDB.local Las Vegas Sep 22–25 query
5. Watch agent activity → 96% recommendation → Book
6. Confirm corporate Visa •••• 4242 TEST MODE
7. Trips / Expenses / Insights budget + SF hotel-cap suggestion

## Scripts

```bash
npm run dev
npm run seed
npm test
npm run build
```
