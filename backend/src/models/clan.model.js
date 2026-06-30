const clans=[];

export const createClan=(clan)=>{

 clans.push(clan);

 return clan;

};

export const findClan=(nome)=>{

 return clans.find(
  clan=>clan.nome===nome
 );

};

export const getClans=()=>{

 return clans;

};

export const addPlayer=(clanNome,jogador)=>{

 const clan=
 findClan(clanNome);

 if(!clan){

  return null;

 }

 clan.jogadores.push(jogador);

 return clan;

};