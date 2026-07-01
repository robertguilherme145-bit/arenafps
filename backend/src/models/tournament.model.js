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

export const registerClanTournament=(
 tournamentId,
 clan
)=>{

 const torneio=
 findTournament(
  tournamentId
 );

 if(!torneio){

  return null;

 }

 torneio.inscritos.push({

  id:Date.now(),

  clan,

  status:"pendente"

 });

 return torneio;

};

export const approveSubscription=(

 tournamentId,

 clan

)=>{

 const torneio=
 findTournament(
  tournamentId
 );

 if(!torneio){

  return null;

 }

 const inscricao=
 torneio.inscritos.find(

  i=>

  i.clan===clan

 );

 if(!inscricao){

  return null;

 }

 inscricao.status=
 "aprovado";

 return inscricao;

};