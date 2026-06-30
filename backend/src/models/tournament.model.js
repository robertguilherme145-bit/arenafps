const tournaments=[];

export const createTournament=(data)=>{

 tournaments.push(data);

 return data;

};

export const listTournaments=()=>{

 return tournaments;

};

export const findTournament=(id)=>{

 return tournaments.find(
  t=>t.id===Number(id)
 );

};