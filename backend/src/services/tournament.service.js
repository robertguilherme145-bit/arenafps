import {
 createTournament
}
from "../models/tournament.model.js";

export const createTournamentService=(data)=>{

 return createTournament(data);

};