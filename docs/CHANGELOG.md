# Changelog

## Sprint 2 Foundation

- Added Competition Engine event dispatch for payment approvals and saved match
  results.
- Payment webhook now delegates entry confirmation to the Competition Engine.
- Match result saving now emits `match.result_saved`.
- Added calculated tournament ranking service.
- Added calculated tournament player statistics service.
- Added optional player stats payload for match finalization.
- Documented `match_player_stats` database table.
- Added backend tests for Competition Engine action resolution.

## Sprint 3 Competition Operations

- Added normalized game maps and per-game player ID settings.
- Added tournament format, best-of, rules, map pool and configurable veto order.
- Added match veto sessions with auditable ban, pick, decider and reset actions.
- Added match map results and automatic MD1/MD3/MD5 series finalization.
- Added official player match sheets with K/D/A/HS/MVP facts.
- Match creation now uses confirmed entries with complete lineups instead of raw IDs.
- Rebuilt the tournament wizard as a functional nine-step flow.
- Rebuilt the admin operations workspace for games, maps, rules, matches and pick/ban.
- Restored authenticated sessions after browser refresh and protected admin routes by role.
- Added unit and temporary-database integration coverage for veto, series and player stats.

## Sprint 4 Player Career

- Rebuilt the player workspace into dashboard, profile, teams, lineup, matches, calendar, statistics, career, messages, support and settings modules.
- Added linked game profiles and platform IDs, team search, join requests, invite decisions and voluntary departure with preserved career history.
- Added player attendance, read-only live veto, protected match credentials and per-map result sheets.
- Added global and internal rankings, monthly and tournament performance, XP, levels, achievements and a competitive timeline.
- Added internal team chat, player-owned support ticket conversations and notification center.
- Added real TOTP two-factor authentication with QR setup and a second login step.
- Added revocable JWT device sessions with browser, IP and last-access visibility.
- Added responsive desktop/mobile validation and TOTP test coverage.
