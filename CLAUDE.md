# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bomb Busters — a cooperative multiplayer wire-cutting board game built with TypeScript, React, and PartyKit. Players work together to cut wires without triggering detonators, with hidden information mechanics (you can't see other players' tiles).

## Commands

```bash
# Install dependencies
pnpm install

# Run both client and server in parallel
pnpm dev:all

# Run individually
pnpm dev              # Client only (Vite, port 3000)
pnpm dev:server       # Wrangler dev server (port 1999)

# Type-check all packages
pnpm typecheck

# Run tests (Vitest)
pnpm test

# Build for production (builds shared first, then client)
pnpm build
```

A pre-commit hook runs `pnpm build` on every commit. It is installed automatically via the `prepare` script when you run `pnpm install`.

## Architecture

**Monorepo with 3 pnpm workspace packages:**

- **`packages/shared`** — Types, protocol messages, game constants, mission definitions. Zero runtime dependencies. All other packages import from `@bomb-busters/shared`.
- **`packages/server`** — Cloudflare Worker + Durable Object (`partyserver`). Authoritative game state, action validation, turn management, and per-player state filtering (information hiding).
- **`packages/client`** — React 19 + Vite 6 + Tailwind CSS 4 frontend. Connects to server via `partysocket`.

**Server is the source of truth.** All game logic runs server-side. The client sends action messages and renders filtered state it receives. The server filters each player's view to enforce hidden information (you can't see other players' uncut tiles).

**Key server modules:**
- `index.ts` — Durable Object Server class, message routing, room state persistence
- `setup.ts` — Game initialization, tile creation/distribution
- `gameLogic.ts` — Action execution (dual cut, solo cut, reveal reds), turn advancement, win/loss checks
- `validation.ts` — Action validation before execution
- `viewFilter.ts` — Per-player state filtering for hidden information

**Game phases flow:** lobby → setup_info_tokens → playing → finished

**Client state management:** `usePartySocket` hook manages WebSocket connection and exposes `lobbyState`, `gameState`, `lastAction`, and `send()`.

## Environment Variables

- `VITE_PARTYKIT_HOST` — PartyKit server URL (defaults to `localhost:1999` in dev)

## Tech Stack

- TypeScript 5.7 (strict mode, ES2022 target, bundler module resolution)
- React 19, Vite 6, Tailwind CSS 4
- partyserver (Cloudflare Durable Objects for WebSocket rooms)
- pnpm workspaces
