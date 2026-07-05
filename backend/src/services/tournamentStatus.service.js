import TOURNAMENT_STATUS from "../constants/tournamentStatus.js";

/**
 * Verifica se uma transição de status é permitida.
 */
export function canChangeTournamentStatus(currentStatus, newStatus) {
    const transitions = {
        [TOURNAMENT_STATUS.CREATED]: [
            TOURNAMENT_STATUS.OPEN,
            TOURNAMENT_STATUS.CANCELED
        ],

        [TOURNAMENT_STATUS.OPEN]: [
            TOURNAMENT_STATUS.CLOSED,
            TOURNAMENT_STATUS.CANCELED
        ],

        [TOURNAMENT_STATUS.CLOSED]: [
            TOURNAMENT_STATUS.IN_PROGRESS,
            TOURNAMENT_STATUS.CANCELED
        ],

        [TOURNAMENT_STATUS.IN_PROGRESS]: [
            TOURNAMENT_STATUS.FINISHED
        ],

        [TOURNAMENT_STATUS.FINISHED]: [],

        [TOURNAMENT_STATUS.CANCELED]: []
    };

    return transitions[currentStatus]?.includes(newStatus) ?? false;
}