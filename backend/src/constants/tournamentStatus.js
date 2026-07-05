/**
 * Status oficiais dos torneios
 */

const TOURNAMENT_STATUS = Object.freeze({
    CREATED: "criado",
    OPEN: "aberto",
    CLOSED: "fechado",
    IN_PROGRESS: "em_andamento",
    FINISHED: "finalizado",
    CANCELED: "cancelado"
});

export default TOURNAMENT_STATUS;