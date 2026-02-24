# TODO - Implementation Planning

All game rules content in `GAME_RULES.md` is now fully synced to physical card text (missions 1-66, equipment cards 1-12 + campaign, constraint cards A-L, challenge cards 1-10, character cards 1-5 + E1-E4, rule stickers A/B/C).

## Next Steps

Perform a full codebase gap analysis comparing `GAME_RULES.md` against the current implementation in `packages/shared`, `packages/server`, and `packages/client`. Use the results to build a detailed, phased implementation plan covering:

- Mission schema parity (titles, setup fields, hook definitions for all 66 missions)
- Constraint card validation logic (A-L)
- Challenge card system (1-10)
- Character cards (base 1-5 and new E1-E4 with unique personal equipment)
- Rule sticker campaign progression (A/B/C)
- Campaign equipment integration (False Bottom, Disintegrator, Grappling Hook, etc.)
- Number card deck system
- Mission-specific mechanics (oxygen, Nano/Bunker trackers, speed/timer, boss missions, simultaneous cuts)
- Server game logic updates (validation, action resolution, win/loss checks)
- Client UI for mission objects and mission-specific interactions
- View filtering and persistence for new state objects
- Test coverage for all new mechanics
