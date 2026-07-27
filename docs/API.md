# Arena Camp API

## Identity and authentication

- `POST /auth/register`, `/auth/login`, `/auth/verify-email`,
  `/auth/forgot-password` and `/auth/reset-password`: password account flow.
- `GET /auth/oauth/:provider`: starts Google, Discord or Steam authentication.
- `GET /auth/oauth/:provider/callback`: validates provider response and creates
  a short-lived, one-use login code.
- `POST /auth/oauth/exchange`: exchanges that code for the authenticated session.
- `POST /auth/oauth/complete-profile`: collects a real email for providers that
  do not expose it.
- `GET /identity/me`: current roles, games, teams, organizations and active context.
- `PUT /identity/context`: switches active role, game and team.
- `PUT /identity/games`: updates the account game portfolio and primary game.
- `POST /identity/organizations`: creates an organizer context.

## Public portal

- `GET /public/portal?game_id=`: live homepage, rankings and editorial content.
- `GET /public/search?q=&game_id=`: global tournament, team, player and organization search.
- `GET /public/tournaments/:id`: public tournament center, standings, matches and bracket data.
- `POST /public/contact`: opens a contact item in the admin queue.

## Platform administration

- `/admin/access-accounts`: unified account roles and game access.
- `/admin/achievements`: global or game-specific goals, tiers and XP rewards.
- `/admin/public-content`: news, FAQ, partners and testimonials.
- `/admin/public-contacts`: public support queue.

## Matches

`PATCH /match/:id/result`

Registers the official result of a match. Optional `player_stats` records the
facts used to calculate rankings and statistics.

```json
{
  "score_team_a": 16,
  "score_team_b": 12,
  "player_stats": [
    {
      "player_id": 1,
      "team_id": 10,
      "kills": 24,
      "deaths": 13,
      "assists": 6,
      "headshots": 12,
      "mvp": true
    }
  ]
}
```

## Calculated Competition Data

`GET /tournament/:id/ranking`

Returns team ranking calculated from finished matches.

`GET /tournament/:id/statistics`

Returns player statistics calculated from official match facts.

## Competition Setup (Admin)

All routes below require an authenticated `admin` token.

- `GET /admin/competition/games`: games with player-ID settings and map counts.
- `PUT /admin/competition/games/:gameId/settings`: player ID label, requirement and default series.
- `GET|POST /admin/competition/games/:gameId/maps`: list or create maps for one game.
- `PUT|DELETE /admin/competition/maps/:mapId`: edit or deactivate a map.
- `GET|PUT /admin/competition/tournaments/:tournamentId`: format, rules, series, map pool and veto order.
- `GET /admin/competition/tournaments/:tournamentId/teams`: enrolled teams and lineup eligibility.
- `GET /admin/competition/matches/:matchId`: match operations, rosters, IDs, veto, maps, per-map stats and aggregate totals.
- `POST /admin/competition/matches/:matchId/veto/open`: release the configured veto.
- `POST /admin/competition/matches/:matchId/veto/actions`: register the next ban, pick or decider.
- `POST /admin/competition/matches/:matchId/veto/reset`: clear the veto and generated match maps.
- `POST /admin/competition/matches/:matchId/maps`: assign a map manually when needed.
- `PATCH /admin/competition/match-maps/:matchMapId/result`: save one map result and update the series.
- `PUT /admin/competition/matches/:matchId/maps/:matchMapId/player-stats`: save official K/D/A/HS/MVP facts for one finalized map and recalculate match totals.
- `PUT /admin/competition/matches/:matchId/player-stats`: legacy aggregate endpoint, accepted only while the match has no per-map stats.

The server validates game ownership of maps, tournament enrollment, complete lineups,
veto order, map uniqueness and series majority before dispatching Competition Engine events.

## Payments

- `POST /payment/webhook`: receives signed Mercado Pago payment updates, verifies the payment through the gateway and updates payment/entry status idempotently.
- `POST /leader/payments/sync`: authenticated fallback that reconciles a team's pending PIX payments while the leader finance screen is open.

An approved payment confirms the entry through the Competition Engine and creates
deduplicated notifications for platform administrators and the team leader.

## Team Player Ranking

The authenticated workspace responses expose the same `team_ranking` contract:

- `GET /leader/workspace`
- `GET /captain/workspace`
- `GET /dashboard` as `team_rankings`, one entry for each player team

The ranking includes every active player profile, even without recorded matches.
Only finalized matches and maps contribute official totals. Each player contains
matches, maps, wins, losses, K/D/A, K/D, KDA, HS%, MVPs, kills per map, best map
and a `map_statistics` breakdown.

## Player Workspace

All routes require an authenticated `jogador` token.

- `GET /player/workspace`: profile, linked games, teams, requests, lineups, matches, calendar, messages, career, achievements, tickets and security sessions.
- `GET /player/teams/search`: team discovery by name, game, region and recruiting status.
- `PUT /player/workspace/profile` and `PUT /player/workspace/games/:gameId`: competitive identity and platform IDs.
- `POST /player/workspace/teams/:teamId/request`, invite response and request cancellation routes: player-controlled team entry.
- `PUT /player/workspace/matches/:matchId/attendance`: confirms availability and notifies team staff about absences.
- `GET /player/workspace/matches/:matchId/room`: read-only room, veto and per-map statistics; server credentials are restricted to the official lineup.
- Team messages, support tickets, preferences, password and voluntary team-leave routes are available below `/player/workspace`.
- `/player/workspace/security/2fa/*`: generates a TOTP QR Code, confirms activation and securely disables 2FA.
- `/player/workspace/security/sessions/:sessionId`: revokes an authenticated device session.
- `GET /player/public/:slug`: privacy-aware public career with rankings, games, achievements and official history; email and birth date are never exposed.

When 2FA is enabled, `POST /auth/login` first returns `{ "requires_two_factor": true }` and only issues a JWT after a valid six-digit TOTP code is submitted.
