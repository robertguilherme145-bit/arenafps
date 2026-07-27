import test from "node:test";
import assert from "node:assert/strict";

import TOURNAMENT_STATUS from "../src/constants/tournamentStatus.js";
import { resolveNextTournamentAction } from "../src/services/competitionEngine.service.js";

test("engine opens registrations for created tournaments", () => {
    assert.equal(
        resolveNextTournamentAction({ status: TOURNAMENT_STATUS.CREATED }),
        "open_registrations"
    );
});

test("engine closes registrations when confirmed entries reach max teams", () => {
    assert.equal(
        resolveNextTournamentAction({
            status: TOURNAMENT_STATUS.OPEN,
            confirmed_entries: 16,
            max_teams: 16
        }),
        "close_registrations"
    );
});

test("engine keeps open tournament without full confirmed entries untouched", () => {
    assert.equal(
        resolveNextTournamentAction({
            status: TOURNAMENT_STATUS.OPEN,
            confirmed_entries: 10,
            max_teams: 16
        }),
        null
    );
});

test("engine finishes tournament only when no pending matches remain", () => {
    assert.equal(
        resolveNextTournamentAction({
            status: TOURNAMENT_STATUS.IN_PROGRESS,
            pending_matches: 0,
            finished_matches: 7
        }),
        "finish_tournament"
    );
});
