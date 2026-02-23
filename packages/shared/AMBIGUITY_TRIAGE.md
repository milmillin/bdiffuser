# Mission Schema — Ambiguity Triage List

**Date:** 2026-02-22
**Scope:** Missions 9-66 + supplementals 31/32/35; all non-generic `behaviorHooks` in `missionSchema.ts`.
**Source:** Hook names, schema notes, `MISSION_SCHEMA_VERIFICATION.md` discrepancies.

## Column Definitions

| Column | Description |
|--------|-------------|
| missionId | Mission number (or `cross` for cross-cutting) |
| rule | Short description of the ambiguous rule / approximation |
| options | Plausible interpretations that need resolution |
| default | Current schema assumption / best-guess interpretation |
| owner | Person/team responsible for resolution |
| status | `open` / `blocked` / `resolved` |

---

## Setup & Data Ambiguities

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 41 | Equipment exclusion targets campaign "Double fond" but schema used unlock-value filtering | (A) Add campaign-equipment model and exclude "Double fond" by id; (B) Remove exclusion entirely until campaign equipment is in draw pool; (C) Add `excludedCampaignEquipment` string field | **Resolved with (A): mission now uses `includeCampaignEquipment:true` + `excludedEquipmentIds:[\"double_fond\"]`** | codex | resolved |
| 57 | Equipment exclusion targets "10-10 Disintegrator" but schema used unlock-value filtering | (A) Add campaign-equipment model and exclude "10-10" by id; (B) Remove exclusion until campaign equipment is modeled; (C) Same new field as M41 | **Resolved with (A): mission now uses `includeCampaignEquipment:true` + `excludedEquipmentIds:[\"disintegrator\"]`** | codex | resolved |
| 52 | 2p override adds `yellow: exact(4)` but 3-5p has `yellow: none` — asymmetry not explained by hook name | (A) 2p yellow is a balancing compensator for only 2 players; (B) Typo in source material | 2p override is intentional balancing | unassigned | open |
| 41 | 5p override `yellow: exact(4)` is redundant with base setup | (A) Remove redundant override for clarity; (B) Keep for explicitness | Harmless, keep as-is | unassigned | open |

## Behavior Hook Ambiguities — Timer & Turn Order

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 10 | `mission_10_timer_and_dynamic_turn_order` — timer mechanism undefined | (A) Real-time countdown clock (e.g. 15 min); (B) Turn-count limit; (C) Audio track timer (app plays music) | **(A) Real-time 900s countdown with audio cue** | — | resolved |
| 10 | `mission_10_timer_and_dynamic_turn_order` — "dynamic turn order" undefined | (A) Captain chooses next player each turn; (B) Random next player; (C) Reverse direction after trigger | **(A) Captain designates next player each turn** | — | resolved |

## Behavior Hook Ambiguities — Wire Mechanics

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 11 | `mission_11_blue_value_treated_as_red` — which blue value becomes red-like | (A) One specific blue value drawn at setup acts as hidden red; (B) Any blue above a threshold is treated as red; (C) Number card draw determines which blue is "red" | **(A) 1 random blue value secretly acts as detonator; no player knows which** | — | resolved |
| 20 | `mission_20_x_marked_unsorted_wires` — X marking and "unsorted" semantics | (A) Some wires have no sort-value markers, X means unknown; (B) Wires exist but are shuffled without position indicators; (C) X is a visual marker on tiles whose sort value is hidden from all | **(B) Last dealt wire per player is removed from sorted order, placed at far right, and marked with X. X wires ignore all equipment (active and personal). Walkies-Talkies excluded from equipment pool.** | — | resolved |
| 35 | `mission_35_x_marked_blue_wires` — how many blues get X, selection method | (A) Fixed count of X-marked blues (e.g. 2); (B) Random subset; (C) Captain chooses which blues get X | Random subset of blue wires get X marker (count from card) | unassigned | open |
| 38 | `mission_38_captain_upside_down_wire` — "upside down" mechanical meaning | (A) Captain's wire tile is flipped so they cannot see their own value; (B) Captain's wire sort value is inverted (12 becomes 1); (C) Wire is placed face-down, hidden from captain but visible to others | Captain cannot see one of their own wire values (flipped tile) | unassigned | open |
| 56 | `mission_56_each_player_upside_down_wire` — same mechanic as M38 but per player | (A) Each player has 1 flipped wire (hidden from self, visible to others); (B) Hidden from everyone; (C) Hidden from self only | Each player has 1 wire hidden from self, visible to others | unassigned | open |
| 64 | `mission_64_two_upside_down_wires_each` — scaling of upside-down mechanic | (A) Each player has exactly 2 flipped wires; (B) 2 total across all players | Each player has 2 wires hidden from self | unassigned | open |

## Behavior Hook Ambiguities — Token Variants

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 17 | `mission_17_false_info_tokens` — false token count and knowledge | (A) Fixed N tokens are false (inverted value); (B) Random subset; (C) Token owner knows theirs is false; (D) No one knows which are false | Some tokens show incorrect values; no one knows which | unassigned | open |
| 21 | `mission_21_even_odd_tokens` — token value representation | (A) Token shows "even" or "odd" instead of exact number; (B) Token shows range parity; (C) Even/odd applies to wire value, token shows the category | Tokens show "even" or "odd" label instead of a number | unassigned | open |
| 22 | `mission_22_absent_value_tokens` — "absent value" definition | (A) Token shows a value that is NOT on the tile; (B) Token slot is left empty (no information given); (C) Token shows a value absent from the entire game | **(A) Token indicates a value NOT present on the player's tile; fixed 1↔2 mapping (information-equivalent to value+1)** | codex | documented |
| 24 | `mission_24_count_tokens_x1_x2_x3` — multiplier token semantics | (A) Tokens are multipliers applied to wire values; (B) Tokens indicate how many wires of a certain type exist; (C) x1/x2/x3 represent confidence levels | Tokens represent wire-count multipliers (x1=1 wire, x2=2 wires, x3=3 wires of indicated type) | unassigned | open |
| 33 | `mission_33_even_odd_tokens` — differences from mission 21 | (A) Identical mechanic to M21; (B) Different parity rules or additional constraints | Same even/odd token mechanic as M21 | unassigned | open |
| 40 | `mission_40_alternating_token_types` — what types alternate and trigger | (A) Tokens alternate between numeric and even/odd each round; (B) Tokens alternate between true and false each turn; (C) Token type changes per player in seating order | Token type alternates between two variants across turns | unassigned | open |
| 52 | `mission_52_all_tokens_false` — setup and player awareness | (A) All tokens are inverted at setup, players are told; (B) All tokens are inverted, players are NOT told; (C) Tokens are random false values unrelated to actual | All tokens show incorrect values; players are informed of this rule | unassigned | open |

## Behavior Hook Ambiguities — Token Flow & Placement

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 13 | `mission_13_random_info_token_setup` — randomization method | (A) Tokens are shuffled and dealt randomly instead of captain-placed; (B) Random subset of tokens placed, rest discarded; (C) Captain places but values are randomized | Info tokens are randomly assigned instead of captain-choosing placement | unassigned | open |
| 22 | `mission_22_yellow_trigger_token_pass` — pass direction and scope | (A) Cutting yellow triggers passing all tokens clockwise; (B) Pass one token to player of choice; (C) All players simultaneously pass one token left | Yellow wire cut triggers token passing between players; direction/count unclear | unassigned | open |
| 27 | `mission_27_yellow_trigger_random_token_draft` — draft pool and mechanics | (A) Yellow cut triggers drawing random token from unused pool; (B) Yellow cut triggers redrafting from all tokens; (C) New random token replaces an existing one | Cutting yellow triggers a random token draw from pool | unassigned | open |

## Behavior Hook Ambiguities — Equipment & Items

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 12 | `mission_12_equipment_double_lock` — unlock mechanics | (A) Equipment requires 2 matching wire cuts to unlock (instead of 1); (B) Equipment costs 2 actions to use; (C) Equipment unlocks require cutting a wire equal to 2× the unlock value | **(A) Equipment requires 2 matching wire cuts to unlock (not 1)** | — | resolved |
| 15 | `mission_15_face_down_equipment_unlock_via_number_deck` — reveal timing and deck interaction | (A) Equipment placed face-down, number card draw determines which flips up; (B) Number deck replaces normal unlock; (C) Draw number card, equipment with matching unlock value is revealed | Equipment is face-down; number card draws reveal/unlock equipment | unassigned | open |
| 17 | `mission_17_sergio_equipment_restriction` — what restriction applies | (A) Specific equipment cards are banned; (B) Equipment can only be used by certain players; (C) Equipment use costs extra (e.g. detonator tick) | Equipment use is restricted in a mission-specific way | unassigned | open |
| 18 | `mission_18_forced_general_radar_flow` — timing and mandatory use | (A) General Radar must be used first action of game; (B) Must be used every N turns; (C) Mandatory use before any solo cut | General Radar must be used at a specific point; exact trigger unknown | unassigned | open |
| 23 | `mission_23_hidden_equipment_pile` — pile mechanics | (A) Equipment drawn from face-down pile one at a time; (B) All equipment hidden, random draw per turn; (C) Equipment pile replaces normal unlock; drawn on cut success | Equipment is in a hidden face-down pile; draw replaces normal unlock | unassigned | open |
| 58 | `mission_58_no_info_tokens_unlimited_double_detector` — double detector scope | (A) No info tokens at all; Double Detector equipment is unlimited use; (B) Double Detector replaces token phase; (C) Double Detector has unlimited charges but still uses action | No info tokens; Double Detector equipment can be used unlimited times | unassigned | open |

## Behavior Hook Ambiguities — Simultaneous Actions

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 13 | `mission_13_simultaneous_red_cut_action` — coordination and failure | (A) All players simultaneously choose and cut a red wire; (B) Subset of players cut simultaneously; (C) All players must agree on which reds to cut, then execute at once | All players simultaneously perform a red-wire cut action | unassigned | open |
| 23 | `mission_23_simultaneous_four_of_value_action` — trigger and target | (A) When 4 players agree on a value, all cut wires of that value simultaneously; (B) 4 copies of the same value trigger a special action; (C) Players simultaneously declare a value and matching wires are cut | Players simultaneously execute an action when 4 of the same value appear | unassigned | open |
| 39 | `mission_39_no_equipment_simultaneous_four` — relationship to M23 mechanic | (A) Same as M23 simultaneous-four mechanic, just no equipment available; (B) Different simultaneous mechanic unique to M39 | Same simultaneous-four mechanic as M23, combined with no-equipment rule | unassigned | open |
| 48 | `mission_48_simultaneous_three_yellow` — yellow-specific simultaneous cut | (A) 3 yellow wires must be cut simultaneously by 3 players; (B) One player cuts all 3 yellow at once; (C) 3 yellows are cut in a single action but sequentially | 3 yellow wires are cut in a coordinated simultaneous action | unassigned | open |

## Behavior Hook Ambiguities — Constraints & Restrictions

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 16 | `mission_16_sequence_priority_face_b` — face B specifics | (A) Sequence card has a B-side with reversed priority; (B) B-side has a completely different priority ordering; (C) B-side adds additional restrictions on top of normal sequence | Sequence card is flipped to face B which changes cut priority order | unassigned | open |
| 25 | `mission_25_no_spoken_numbers` — digital enforcement | (A) Purely a social/honor rule, no digital enforcement; (B) Chat filter blocks numeric characters; (C) UI hides numeric displays, forcing non-numeric communication | Social rule — no digital enforcement, advisory only | unassigned | open |
| 28 | `mission_28_captain_lazy_constraints` — constraint specifics | (A) Captain cannot cut wires; (B) Captain can only use equipment, not cut; (C) Captain has reduced action set (e.g. only dual cuts) | Captain has specific action restrictions (cannot perform some actions) | unassigned | open |
| 31 | `mission_31_personal_constraints_a_to_e` — constraint card definitions A-E | (A) 5 predefined constraint cards, each with unique restriction; (B) Random draw from larger pool, labeled A-E; (C) Progressive constraints (A=easy, E=hard) | 5 specific constraint cards (A-E), each imposing a unique personal restriction | unassigned | open |
| 32 | `mission_32_global_constraint_stack` — stacking behavior | (A) Constraints accumulate (all active simultaneously); (B) New constraint replaces previous; (C) Stack of N cards, revealed one per round | Constraint cards form a stack; revealed progressively, accumulating | unassigned | open |
| 34 | `mission_34_hidden_weak_link_and_constraints` — weak link selection and knowledge | (A) One player secretly designated weak link with extra constraints; (B) Weak link is public but constraints are hidden; (C) Random hidden role with penalty on failure | One player is secretly the weak link; only they know; extra constraints apply to them | unassigned | open |
| 37 | `mission_37_rolling_constraint` — rolling mechanism | (A) Constraint changes each round via dice/card draw; (B) Constraint cycles through predefined sequence; (C) Constraint moves to next player each turn | Active constraint changes each round in a predefined cycle | unassigned | open |
| 57 | `mission_57_constraint_per_validated_value` — constraint scaling | (A) Each successfully validated wire value adds a new constraint; (B) Each value on info tokens adds a constraint; (C) Constraint cards drawn equal to number of validated wires | New constraint added each time a wire value is validated | unassigned | open |
| 61 | `mission_61_rotating_constraints` — rotation pattern | (A) Constraints rotate clockwise each round; (B) Constraints shuffle randomly each round; (C) Each player's constraint moves to the next player | Constraints rotate clockwise between players each round | unassigned | open |

## Behavior Hook Ambiguities — Number Cards & Challenges

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 26 | `mission_26_visible_number_card_gate` — gating condition | (A) Number card drawn face-up; players cannot cut values above/below it; (B) Number card gates equipment unlock; (C) Number card must match wire value to allow cut | Visible number card restricts which wire values can be legally cut | unassigned | open |
| 29 | `mission_29_hidden_number_card_penalty` — penalty trigger and effect | (A) Hidden number card; cutting a wire matching it causes detonator advance; (B) Hidden card revealed at end, mismatch = penalty; (C) Drawing a number card triggers a penalty action | Hidden number card imposes a penalty when its value is matched by a cut | unassigned | open |
| 45 | `mission_45_squeak_number_challenge` — "squeak" mechanic | (A) Players must say "squeak" before revealing; failure = penalty; (B) Squeak = quick-draw challenge comparing numbers; (C) Number card challenge with time pressure | Number challenge with a "squeak" (speed/vocal) element | unassigned | open |
| 47 | `mission_47_add_subtract_number_cards` — arithmetic scope | (A) Number cards can be added/subtracted to modify wire values; (B) Players draw 2 number cards and use sum/difference; (C) Number cards modify the detonator threshold | Number cards allow arithmetic operations on wire cut values | unassigned | open |
| 55 | `mission_55_challenge_cards_reduce_detonator` — challenge card mechanics | (A) Completing a challenge card reduces detonator by 1; (B) Challenge cards are drawn each round, success = detonator reduction; (C) Players choose to attempt a challenge for detonator relief | Challenge card completion rewards players with detonator reduction | unassigned | open |
| 60 | `mission_60_challenge_cards_reduce_detonator` — differences from M55 | (A) Identical to M55 challenge mechanic; (B) Different challenge types or different detonator reduction amounts; (C) Additional constraints layered on M55 mechanic | Same challenge-card mechanic as M55 | unassigned | open |
| 62 | `mission_62_number_card_completions_reduce_detonator` — completion definition | (A) Completing a sequence of number cards (e.g. 1-2-3) reduces detonator; (B) Each number card played reduces detonator by 1; (C) Collecting a set of number cards grants detonator reduction | Completing number-card sequences reduces detonator | unassigned | open |

## Behavior Hook Ambiguities — Nano / Oxygen / Bunker Tracks

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 43 | `mission_43_nano_track_and_hidden_wire_pool` — nano track progression | (A) Nano advances on each cut; reaching threshold = loss; (B) Nano advances on failures only; (C) Nano has bidirectional movement based on cut quality | Nano track advances toward loss condition; trigger unclear | unassigned | open |
| 43 | `mission_43_nano_track_and_hidden_wire_pool` — hidden wire pool draw rules | (A) Additional wires drawn from hidden pool each round; (B) Hidden pool wires replace cut wires; (C) Hidden pool is revealed incrementally | Hidden wire pool adds wires to the game progressively | unassigned | open |
| 44 | `mission_44_oxygen_cost_and_no_talking` — oxygen cost per action | (A) Each action costs 1 oxygen from shared pool; (B) Each turn costs oxygen; (C) Only specific actions cost oxygen | Actions cost oxygen from a shared pool; cost-per-action unclear | unassigned | open |
| 49 | `mission_49_oxygen_transfer_economy` — transfer rules | (A) Players can transfer oxygen to others on their turn; (B) Oxygen auto-transfers on specific triggers; (C) Oxygen can be spent to help another player's cut | Players can transfer oxygen between each other; timing and cost unclear | unassigned | open |
| 53 | `mission_53_nano_replaces_detonator` — replacement semantics | (A) Nano track fully replaces detonator as loss condition; (B) Nano absorbs hits that would advance detonator; (C) Both nano and detonator are active, nano adds a second loss path | Nano track replaces detonator as the primary loss condition | unassigned | open |
| 54 | `mission_54_red_stack_and_oxygen` — red stack draw mechanics | (A) All reds are in a stack, drawn one per round; (B) Red stack with oxygen cost to draw/reveal; (C) Reds revealed from stack based on oxygen spending | Red wires form a stack drawn incrementally; oxygen interaction unclear | unassigned | open |
| 59 | `mission_59_nano_navigation_values` — nano navigation rules | (A) Nano position determines which wire values are legal to cut; (B) Wire values move the nano marker on a track; (C) Nano marker navigates a grid based on cut wire values | Nano marker movement is driven by wire values cut; navigation rules undefined | unassigned | open |
| 63 | `mission_63_rotating_oxygen_pool` — rotation mechanics | (A) Shared oxygen pool rotates ownership each round; (B) Oxygen tokens physically move clockwise; (C) Each player's oxygen limit changes each round | Oxygen pool rotates between players each round; exact trigger unclear | unassigned | open |
| 66 | `mission_66_bunker_flow` — bunker state machine | (A) Multi-stage bunker with progressive difficulty; (B) Bunker is a branching path (choose left/right); (C) Linear bunker track with checkpoints | Bunker is a multi-stage progression; state transitions undefined | unassigned | open |

## Behavior Hook Ambiguities — Special Actions & Roles

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 14 | `mission_14_intern_failure_explodes` — intern role and trigger | (A) Lowest-rank player is intern; any failure = immediate loss; (B) Intern role rotates; their solo-cut failure = bomb; (C) New player role with special failure penalty | A designated "intern" player's failure causes instant explosion; role assignment unclear | unassigned | open |
| 27 | `mission_27_no_character_cards` — replacement mechanism | (A) No character cards; all players are identical (no roles); (B) Roles replaced by a different mechanism; (C) Captain role still exists but no physical cards | Character cards removed; all players have no special roles | unassigned | open |
| 36 | `mission_36_sequence_card_reposition` — who repositions and when | (A) Active player can reposition sequence card as their action; (B) Captain repositions after each round; (C) Sequence card auto-repositions based on cut results | Sequence card can be repositioned; trigger and actor unclear | unassigned | open |
| 46 | `mission_46_sevens_must_be_last` — "last" scope and validation | (A) Wire value 7 must be the last wire cut in the entire game; (B) Blue 7 must be last cut per round; (C) All wires containing 7 (7, 7.1) must be cut after everything else | Wires with value 7 must be the last ones cut; scope (game vs round) unclear | unassigned | open |
| 50 | `mission_50_no_markers_memory_mode` — digital UI impact | (A) UI hides sort values after initial reveal period; (B) Sort markers never shown, players must communicate; (C) Values visible only during placement, hidden during play | No sort-value markers; digital UI must hide or never show tile values | unassigned | open |
| 51 | `mission_51_boss_designates_value` — designation scope | (A) Boss names a value; wires matching it have special treatment; (B) Boss designates a target value that must be cut first/last; (C) Boss assigns a secret value, revealed later for scoring | Boss designates a value that affects cut priority or legality | unassigned | open |
| 65 | `mission_65_personal_number_cards` — card distribution and visibility | (A) Each player gets their own number card deck, hidden from others; (B) Shared deck but each player draws privately; (C) Personal number cards that only affect their own wires | Each player has personal number cards; visibility and interaction rules undefined | unassigned | open |

## Behavior Hook Ambiguities — Audio / Presentation

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| 19 | `mission_19_audio_prompt` — game logic impact | (A) Purely presentational (play audio file); (B) Audio cue triggers a game event (e.g. timer starts); (C) Audio replaces text communication for a phase | Presentational only — audio prompt has no game-logic side effects | unassigned | open |
| 30 | `mission_30_audio_prompt` — same question as M19 | (A) Purely presentational; (B) Timer-linked; (C) Audio triggers game state change | Presentational only — same as M19 | unassigned | open |
| 42 | `mission_42_audio_prompt` — same question as M19/M30 | (A) Purely presentational; (B) Timer-linked; (C) Unique audio-driven mechanic | Presentational only — same as M19/M30 | unassigned | open |

## Cross-Cutting Framework Ambiguities

| missionId | rule | options | default | owner | status |
|-----------|------|---------|---------|-------|--------|
| cross | Simultaneous action framework (M13, M23, M39, M48) — no shared model | (A) Single "simultaneous action" framework parameterized per mission; (B) Each mission implements ad-hoc simultaneous logic; (C) Generic action type with mission-specific validation | Needs a shared simultaneous-action state model in Phase 0C | unassigned | open |
| cross | Upside-down wire framework (M38, M56, M64) — scaling mechanic not typed | (A) Single "flipped wire" mechanic with count parameter; (B) Per-mission wire-flip logic | Single framework with per-mission count (1, 1-each, 2-each) | unassigned | open |
| cross | Even/odd token framework (M21, M33) — shared or separate | (A) Identical shared mechanic; (B) Different parity rules per mission | Shared even/odd token type reused across missions | unassigned | open |
| cross | Nano track framework (M43, M53, M59) — reusable or per-mission | (A) Single nano-track state model parameterized per mission; (B) Each nano mission has unique track rules | Single nano-track model with per-mission triggers and thresholds | unassigned | open |
| cross | Oxygen economy framework (M44, M49, M54, M63) — shared pool model | (A) Single shared oxygen-pool state model with per-mission costs; (B) Per-mission oxygen implementation | Single oxygen-pool model with configurable costs and transfer rules | unassigned | open |
| cross | Challenge card framework (M55, M60) — shared or separate | (A) Identical shared mechanic; (B) Different challenge types per mission | Shared challenge-card mechanic reused in both missions | unassigned | open |
| cross | Constraint card framework (M31, M32, M34, M37, M57, M61) — many variants | (A) Single constraint system with personal/global/rotating modes; (B) Multiple distinct constraint subsystems; (C) One base system with per-mission overlays | Unified constraint system with modes: personal, global-stack, rotating, per-validated-value | unassigned | open |
| cross | Number card framework (M15, M26, M29, M47, M62, M65) — shared deck model | (A) Single number-card deck model with per-mission draw/reveal rules; (B) Per-mission number-card logic | Single number-card deck state model with configurable visibility and draw rules | unassigned | open |
| cross | Campaign equipment exclusion (M41, M57) — no type support for campaign equipment | (A) Add `excludedCampaignEquipment?: string[]` to `MissionEquipmentSpec`; (B) Add campaign equipment to `EQUIPMENT_DEFS`; (C) Defer until campaign equipment is in draw pool | **Resolved with (B) + ID exclusions: campaign cards added and schema now supports `excludedEquipmentIds`** | codex | resolved |
| cross | Audio prompt missions (M19, M30, M42) — shared vs unique audio handling | (A) Single `audio_prompt` hook with per-mission audio file; (B) Each has unique logic | Single presentational hook, no game-logic impact | unassigned | open |

---

## Decision Tracking Log

Tracks owner assignment, decisions, and resolution dates for each ambiguity.
Each row links to its triage entry above via `ambiguityId` (`AMB-{missionId}-{seq}`).

> **Workflow:** When an ambiguity is picked up, set `owner` and `date assigned`.
> When a decision is made, fill `decision` (chosen option letter + summary), update `date resolved`, and flip `status` to `resolved` in both this table and the triage table above.

| ambiguityId | missionId | rule (short) | owner | decision | date assigned | date resolved | status |
|-------------|-----------|--------------|-------|----------|---------------|---------------|--------|
| AMB-041-1 | 41 | Equipment exclusion targets campaign equip | codex | (A) Added campaign equipment model + excluded by ID (`double_fond`) | 2026-02-23 | 2026-02-23 | resolved |
| AMB-057-1 | 57 | Equipment exclusion targets 10-10 | codex | (A) Added campaign equipment model + excluded by ID (`disintegrator`) | 2026-02-23 | 2026-02-23 | resolved |
| AMB-052-1 | 52 | 2p yellow override asymmetry | unassigned | — | — | — | open |
| AMB-041-2 | 41 | 5p override redundancy | unassigned | — | — | — | open |
| AMB-010-1 | 10 | Timer mechanism | — | (A) Real-time 900s countdown | — | 2026-02-22 | resolved |
| AMB-010-2 | 10 | Dynamic turn order | — | (A) Captain designates next player | — | 2026-02-22 | resolved |
| AMB-011-1 | 11 | Blue value treated as red | — | (A) 1 random blue acts as detonator | — | 2026-02-22 | resolved |
| AMB-020-1 | 20 | X marked unsorted wires | — | (B) Last dealt wire placed unsorted at far right with X marker; all equipment ignores X wires | — | 2026-02-23 | resolved |
| AMB-035-1 | 35 | X marked blue wires count/selection | unassigned | — | — | — | open |
| AMB-038-1 | 38 | Captain upside down wire | unassigned | — | — | — | open |
| AMB-056-1 | 56 | Each player upside down wire | unassigned | — | — | — | open |
| AMB-064-1 | 64 | Two upside down wires each | unassigned | — | — | — | open |
| AMB-017-1 | 17 | False info tokens | unassigned | — | — | — | open |
| AMB-021-1 | 21 | Even/odd tokens | unassigned | — | — | — | open |
| AMB-022-1 | 22 | Absent value tokens | codex | (A) Fixed 1↔2 absent-value mapping; information-equivalent to value+1 | 2026-02-23 | 2026-02-23 | documented |
| AMB-024-1 | 24 | Count tokens x1/x2/x3 | unassigned | — | — | — | open |
| AMB-033-1 | 33 | Even/odd tokens (vs M21) | unassigned | — | — | — | open |
| AMB-040-1 | 40 | Alternating token types | unassigned | — | — | — | open |
| AMB-052-2 | 52 | All tokens false | unassigned | — | — | — | open |
| AMB-013-1 | 13 | Random info token setup | unassigned | — | — | — | open |
| AMB-022-2 | 22 | Yellow trigger token pass | unassigned | — | — | — | open |
| AMB-027-1 | 27 | Yellow trigger random token draft | unassigned | — | — | — | open |
| AMB-012-1 | 12 | Equipment double lock | — | (A) 2 matching cuts to unlock | — | 2026-02-22 | resolved |
| AMB-015-1 | 15 | Face down equipment unlock via number deck | unassigned | — | — | — | open |
| AMB-017-2 | 17 | Sergio equipment restriction | unassigned | — | — | — | open |
| AMB-018-1 | 18 | Forced general radar flow | unassigned | — | — | — | open |
| AMB-023-1 | 23 | Hidden equipment pile | unassigned | — | — | — | open |
| AMB-058-1 | 58 | No info tokens unlimited double detector | unassigned | — | — | — | open |
| AMB-013-2 | 13 | Simultaneous red cut action | unassigned | — | — | — | open |
| AMB-023-2 | 23 | Simultaneous four of value action | unassigned | — | — | — | open |
| AMB-039-1 | 39 | No equipment simultaneous four | unassigned | — | — | — | open |
| AMB-048-1 | 48 | Simultaneous three yellow | unassigned | — | — | — | open |
| AMB-016-1 | 16 | Sequence priority face B | unassigned | — | — | — | open |
| AMB-025-1 | 25 | No spoken numbers enforcement | unassigned | — | — | — | open |
| AMB-028-1 | 28 | Captain lazy constraints | unassigned | — | — | — | open |
| AMB-031-1 | 31 | Personal constraints A-E | unassigned | — | — | — | open |
| AMB-032-1 | 32 | Global constraint stack | unassigned | — | — | — | open |
| AMB-034-1 | 34 | Hidden weak link and constraints | unassigned | — | — | — | open |
| AMB-037-1 | 37 | Rolling constraint | unassigned | — | — | — | open |
| AMB-057-2 | 57 | Constraint per validated value | unassigned | — | — | — | open |
| AMB-061-1 | 61 | Rotating constraints | unassigned | — | — | — | open |
| AMB-026-1 | 26 | Visible number card gate | unassigned | — | — | — | open |
| AMB-029-1 | 29 | Hidden number card penalty | unassigned | — | — | — | open |
| AMB-045-1 | 45 | Squeak number challenge | unassigned | — | — | — | open |
| AMB-047-1 | 47 | Add/subtract number cards | unassigned | — | — | — | open |
| AMB-055-1 | 55 | Challenge cards reduce detonator | unassigned | — | — | — | open |
| AMB-060-1 | 60 | Challenge cards reduce detonator (vs M55) | unassigned | — | — | — | open |
| AMB-062-1 | 62 | Number card completions reduce detonator | unassigned | — | — | — | open |
| AMB-043-1 | 43 | Nano track progression | unassigned | — | — | — | open |
| AMB-043-2 | 43 | Hidden wire pool draw rules | unassigned | — | — | — | open |
| AMB-044-1 | 44 | Oxygen cost per action | unassigned | — | — | — | open |
| AMB-049-1 | 49 | Oxygen transfer economy | unassigned | — | — | — | open |
| AMB-053-1 | 53 | Nano replaces detonator | unassigned | — | — | — | open |
| AMB-054-1 | 54 | Red stack and oxygen | unassigned | — | — | — | open |
| AMB-059-1 | 59 | Nano navigation values | unassigned | — | — | — | open |
| AMB-063-1 | 63 | Rotating oxygen pool | unassigned | — | — | — | open |
| AMB-066-1 | 66 | Bunker flow | unassigned | — | — | — | open |
| AMB-014-1 | 14 | Intern failure explodes | unassigned | — | — | — | open |
| AMB-027-2 | 27 | No character cards | unassigned | — | — | — | open |
| AMB-036-1 | 36 | Sequence card reposition | unassigned | — | — | — | open |
| AMB-046-1 | 46 | Sevens must be last | unassigned | — | — | — | open |
| AMB-050-1 | 50 | No markers memory mode | unassigned | — | — | — | open |
| AMB-051-1 | 51 | Boss designates value | unassigned | — | — | — | open |
| AMB-065-1 | 65 | Personal number cards | unassigned | — | — | — | open |
| AMB-019-1 | 19 | Audio prompt (M19) | unassigned | — | — | — | open |
| AMB-030-1 | 30 | Audio prompt (M30) | unassigned | — | — | — | open |
| AMB-042-1 | 42 | Audio prompt (M42) | unassigned | — | — | — | open |
| AMB-X-01 | cross | Simultaneous action framework | unassigned | — | — | — | open |
| AMB-X-02 | cross | Upside-down wire framework | unassigned | — | — | — | open |
| AMB-X-03 | cross | Even/odd token framework | unassigned | — | — | — | open |
| AMB-X-04 | cross | Nano track framework | unassigned | — | — | — | open |
| AMB-X-05 | cross | Oxygen economy framework | unassigned | — | — | — | open |
| AMB-X-06 | cross | Challenge card framework | unassigned | — | — | — | open |
| AMB-X-07 | cross | Constraint card framework | unassigned | — | — | — | open |
| AMB-X-08 | cross | Number card framework | unassigned | — | — | — | open |
| AMB-X-09 | cross | Campaign equipment exclusion | codex | (B)+(A) Campaign equipment added to defs; mission exclusions moved to `excludedEquipmentIds` | 2026-02-23 | 2026-02-23 | resolved |
| AMB-X-10 | cross | Audio prompt shared handling | unassigned | — | — | — | open |

### Milestone Priority View

Ambiguities blocking each milestone (by mission range):

- **M1 (missions 1-12):** AMB-010-1, AMB-010-2, AMB-011-1, AMB-012-1 — all **resolved**.
- **M2 (missions 13-35):** AMB-013-1, AMB-013-2, AMB-014-1, AMB-015-1, AMB-016-1, AMB-017-1, AMB-017-2, AMB-018-1, AMB-021-1, AMB-022-1, AMB-022-2, AMB-023-1, AMB-023-2, AMB-024-1, AMB-025-1, AMB-026-1, AMB-027-1, AMB-027-2, AMB-028-1, AMB-029-1, AMB-031-1, AMB-032-1, AMB-033-1, AMB-034-1, AMB-035-1 — 25 open.
- **M3 (missions 36-66):** remaining 32 open + 0 blocked.
- **Cross-cutting:** AMB-X-01 through AMB-X-10 — 9 open, 0 blocked.

---

## Summary

| Status | Count |
|--------|-------|
| open | 54 |
| blocked | 0 |
| resolved | 8 |
| documented | 1 |
| **Total** | **63** |
