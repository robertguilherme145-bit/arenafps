# Arena Camp Architecture

Arena Camp is a competition management platform, not a fixed tournament CRUD.
The backend receives official facts, then the Competition Engine calculates the
derived state.

## Layers

Routes -> Controllers -> Services -> Models -> Database

Controllers only translate HTTP input and output. Services own business rules.
Models only run database access. The Competition Engine is a domain service used
by other services through events.

## Identity and context

Authentication is account-based rather than dashboard-based. `user_roles`
stores global RBAC grants; team membership derives player, captain and leader
capabilities; organization membership derives organizer access. The
`user_context_preferences` record selects the active role, game and team.

Every workspace resolves that context server-side. Multi-game filtering is not
only visual: player careers, team workspaces, admin queues, achievements and the
public portal use the selected game as a data boundary.

OAuth accounts are linked by provider subject and can safely merge with an
existing account only when the provider confirms ownership of the same verified
email. Provider callbacks create a hashed, expiring, one-use exchange code so a
long-lived session token is never placed in browser history.

## Admin ownership

Features exposed to users have an administrative control surface: games and map
pools, tournament rules and vetoes, per-map player facts, payments, accounts and
roles, achievement definitions, public content, contacts and audit history.

## Event Flow

Official events:

- `payment.approved`
- `match.result_saved`

Payment approval confirms the entry and can close registrations when the
tournament reaches `max_teams`.

Match result saved recalculates team ranking and player statistics from finished
matches. Rankings, history and statistics are never manually edited.

## Official Source Of Stats

The match is the source of truth. Player statistics are recorded on
`match_map_player_stats` stores the official facts for each player on each map. The backend
rebuilds `match_player_stats` as a compatibility aggregate for the complete series, and the
derived endpoints calculate:

- kills
- deaths
- assists
- headshots
- K/D
- HS%
- win rate
- MVPs
- matches
- wins
- losses

## Public Calculated Endpoints

- `GET /tournament/:id/ranking`
- `GET /tournament/:id/statistics`

## Database Additions For Sprint 2 Foundation

```sql
CREATE TABLE match_player_stats (
  id int(11) PRIMARY KEY AUTO_INCREMENT,
  match_id int(11) NOT NULL,
  player_id int(11) NOT NULL,
  team_id int(11) NOT NULL,
  kills INT NOT NULL DEFAULT 0,
  deaths INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  headshots INT NOT NULL DEFAULT 0,
  mvp TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_match_player_stats_match
    FOREIGN KEY (match_id) REFERENCES matches(id),
  CONSTRAINT fk_match_player_stats_player
    FOREIGN KEY (player_id) REFERENCES players(id),
  CONSTRAINT fk_match_player_stats_team
    FOREIGN KEY (team_id) REFERENCES teams(id),
  UNIQUE KEY uq_match_player_stats_player (match_id, player_id)
);
```
