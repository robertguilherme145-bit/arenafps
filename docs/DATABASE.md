# Arena Camp Database

## Match Player Stats

Player statistics are official facts attached to a finished match. Rankings and
statistics are calculated from this table and from `matches`; they must not have
manual CRUD.

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

## Games, Maps and Match Series

The competition setup is normalized instead of storing maps or veto state in text fields.

- `game_settings`: player ID label/requirement and the game's default series.
- `game_maps`: reusable map catalog owned by one game.
- `tournament_competition_settings`: format, best-of, rules and serialized veto order.
- `tournament_map_pool`: allowed maps for one tournament.
- `match_competition_settings`: immutable series settings copied to a match.
- `match_veto_sessions`: current lifecycle of the match veto.
- `match_veto_actions`: ordered and auditable bans, picks and deciders.
- `match_maps`: maps selected for the series and their official results.
- `match_map_player_stats`: K/D/A/HS/MVP facts owned by one match map; saving them recalculates `match_player_stats` as the series aggregate.

The tables are provisioned idempotently by `ensureCompetitionTables()` during backend startup.
Existing `tournaments.game` values remain supported and are synchronized when competition
settings are saved, allowing the current database to migrate without breaking old records.

## Player Career And Security

Player career totals are calculated from every historical `players` row associated with the same
`user_id`, so changing teams never erases official match statistics.

- `player_links`: Steam, FACEIT, Discord, Riot ID, consoles and social profiles.
- `support_ticket_messages`: auditable conversation history for player support tickets.
- `user_two_factor`: per-account TOTP secret, activation state and confirmation timestamp.
- `user_sessions`: JWT identifier, device, IP, last access, expiration and revocation state.

The optional `users.banner`, `users.birth_date`, `users.languages` and
`team_requests.message` columns and these tables are provisioned idempotently by
`ensurePlayerTables()`.
