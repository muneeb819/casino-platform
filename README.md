# GoldenSpin — Aggregator-Model Online Casino Platform (Demo)

A working reference implementation of the aggregator-model casino blueprint:
one unified game-aggregator contract (with a mock provider standing in for
Hub88 / SOFTSWISS-style services), a double-entry wallet that is the system of
record, player accounts with KYC + responsible-gambling controls, PSP-stub
payments, and a back office with GGR reporting.

> **Engineering demo only — no real money, no real wagering.** Operating a real
> gambling site requires licenses (e.g. Malta/UKGC/PAGCOR/Curacao), a certified
> RNG, AML program, and gambling-approved payment processing.

## Stack

| Layer      | Tech                                                        |
| ---------- | ----------------------------------------------------------- |
| Web        | Next.js 14 (App Router) + Tailwind, TypeScript              |
| API        | NestJS (hand-wired modules), TypeScript                     |
| Database   | SQLite via Prisma (swap `datasource db` to `postgresql` for prod) |
| Ledger     | Append-only `LedgerEntry` rows + cached balances, guarded atomic updates |
| Provider   | Mock aggregator implementing the `AggregatorAdapter` interface |

## Layout

```
casino-platform/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── prisma/           # schema + seed
│   │   └── src/
│   │       ├── common/       # config, guards (JWT, roles, HMAC), errors, Prisma service
│   │       └── modules/
│   │           ├── auth/     # register/login/refresh, /me, RG limits & self-exclusion
│   │           ├── wallet/   # double-entry ledger, deposits/withdrawals, provider callbacks
│   │           ├── games/    # catalog sync, launch flow, mock aggregator + playable mock game
│   │           └── admin/    # overview, players, KYC queue, GGR report
│   └── web/                  # Next.js lobby/wallet/admin UI
└── packages/
    └── shared/               # shared DTO types + constants
```

## Run it

```powershell
cd casino-platform
npm run setup        # install + prisma db push + seed
npm run dev:api      # terminal 1 -> http://localhost:4000
npm run dev:web      # terminal 2 -> http://localhost:3000
```

Seeded logins:

| Role   | Email              | Password      |
| ------ | ------------------ | ------------- |
| Player | demo@demo.local    | `Player1234!` |
| Whale  | whale@demo.local   | `Player1234!` |
| Admin  | admin@demo.local   | `Admin1234!`  |

New signups get a $50 demo bonus automatically.

## The money loop (what to try)

1. Log in as the demo player → **Lobby** → open any game.
2. The launch endpoint creates a `GameSession` and returns an iframe URL from
   the aggregator adapter; the mock game page plays like a real provider would.
3. Every spin calls the same seamless-wallet path a Hub88-style provider uses:
   `bet` debits the player / credits house, `win` reverses it — each inside one
   DB transaction with an overdraft-guarded balance update and idempotent
   `(roundId, type)` uniqueness. Duplicate deliveries return the current state
   instead of double-charging.
4. **Wallet** shows the transaction ledger; **Admin → GGR Report** shows
   wagered/paid/GGR per provider per game.

### Signed provider callbacks

Real aggregators call your wallet over HTTP with HMAC signatures:

```http
POST /provider/wallet/bet
X-Signature: hex(hmac_sha256(PROVIDER_SECRET, raw_body))
{ "userId": "...", "gameId": "...", "roundId": "r_123", "amountCents": 100 }
```

Responses are `{ ok: true, balanceCents }` or `{ ok: false, error: CODE }`
(`INSUFFICIENT_FUNDS`, `PLAYER_BLOCKED`, `ROUND_ALREADY_SETTLED`, ...).
Bad/missing signatures are rejected with 401 before any handler runs.
`POST /provider/wallet/win` and `/provider/wallet/rollback` complete the set;
rollback is rejected if the round already settled.

## Swapping in a real aggregator

Implement `AggregatorAdapter` (`apps/api/src/modules/games/aggregator.interface.ts`)
— `listGames()`, `createSession()` returning the launch URL — register it as the
provider in `GamesService`, and point its server-to-server settlement webhooks
at `/provider/wallet/*`. Everything downstream (ledger, GGR, sessions) is
provider-agnostic.

## Design notes / production gaps

- **Balances** are integer minor units. Use `BIGINT` columns on Postgres for
  high-value currencies; add row locking or serializable isolation under load
  (SQLite's single-writer model serializes transactions here, which is why the
  guarded-update pattern is race-free locally).
- **Deposits/withdrawals** use a stub PSP. Real money needs a gambling-friendly
  PSP or crypto rails plus reconciliation against PSP statements.
- **KYC** stores document references only; wire Sumsub/Onfido in production.
- **JWTs** are short-lived with rotating refresh tokens (hashed at rest);
  move refresh tokens to httpOnly cookies before going live.
- **GGR report excludes rollbacks** by design (they net out of BET/WIN pairs).
- Not implemented: affiliate commission engine, bonus wagering requirements,
  multi-accounting detection, k6/load tests on `/provider/wallet/bet`.
