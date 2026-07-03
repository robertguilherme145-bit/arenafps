import pool from "../config/database.js";

import { createTeam, 
    findLeaderByGame, 
    findTeamByGameAndName, 
    findTeamBySlug, 
    findTeam, 
    getTeamDetails,
    getMembers, 
    isLeader, 
    findUserTeam,
    findUserTeams,
    findMember,
    updateMemberRole,
    findLeader,
    findCaptain,
    updateMemberRoleByUser,
    removeMember } 

from "../models/team.model.js";

import { findGame} 
from "../models/game.model.js";

import { findUserById } 
from "../models/user.model.js";


/**
 * Criar equipe
 */
export async function registerTeam(userId, dados){

    // Usuário existe?
    const usuario = await findUserById(userId);

    if(!usuario){

        throw new Error(
            "Usuário não encontrado."
        );

    }

    // Game existe?
    const game = await findGame(

        dados.game_id

    );

    if(!game){

        throw new Error(
            "Jogo não encontrado."
        );

    }

    // Já lidera equipe neste jogo?
    const lider = await findLeaderByGame(

        userId,

        dados.game_id

    );

    if(lider){

        throw new Error(
            "Você já lidera uma equipe neste jogo."
        );

    }

    // Nome repetido?
    const nomeExiste = await findTeamByGameAndName(

        dados.game_id,

        dados.nome

    );

    if(nomeExiste){

        throw new Error(
            "Já existe uma equipe com este nome neste jogo."
        );

    }

    // Slug repetido?
    const slugExiste = await findTeamBySlug(

        dados.slug

    );

    if(slugExiste){

        throw new Error(
            "Slug já utilizado."
        );

    }

    return await createTeam({

        ...dados,

        creator_id: userId

    });

}

/**
 * Listar membros da equipe
 */
export async function listMembers(userId, teamId){

    console.log("teamId recebido:", teamId);
    // Equipe existe?
    const team = await findTeam(teamId);

    console.log("Equipe encontrada:", team);

    if(!team){
        throw new Error("Equipe não encontrada.");}

    return await getMembers(teamId);

}

/**
 * Buscar minha equipe
 */
export async function getMyTeam(userId){

    const team = await findUserTeam(userId);

    if(!team){

        return {

            team: null

        };

    }

    return {

        team

    };

}

/**
 * Buscar minhas equipes
 */
export async function getMyTeams(userId){

    const teams = await findUserTeams(userId);

    return {teams};

}

/**
 * Buscar detalhes da equipe
 */
export async function getTeam(id){

    const team = await getTeamDetails(id);

    if(!team){

        throw new Error("Equipe não encontrada.");}

    return team;

}

/**
 * Alterar cargo de um membro
 */
export async function changeMemberRole(leaderId, memberId, cargo){

    // Cargo válido?
    if(!["captain","player"].includes(cargo)){

        throw new Error(
            "Cargo inválido."
        );

    }

    // Membro existe?
    const member = await findMember(memberId);

    if(!member){

        throw new Error("Membro não encontrado.");

    }

    // Quem faz a alteração é líder?
    const leader = await isLeader(leaderId, member.team_id);

    if(!leader){

        throw new Error(
            "Sem permissão."
        );

    }

    // Não pode alterar o próprio cargo por aqui
    if(member.user_id === leaderId){

        throw new Error(
            "Você não pode alterar o próprio cargo.");}

    await updateMemberRole(member.id, cargo);

    return {

        mensagem: "Cargo atualizado com sucesso."

    };

}
/**
 * Transferir liderança
 */
export async function transferLeadership(leaderId, memberId){

    const connection = await pool.getConnection();

    try{

        await connection.beginTransaction();

        // Novo líder
        const member = await findMember(memberId);

        if(!member){

            throw new Error("Membro não encontrado.");}

        // Líder atual
        const leader = await findLeader(member.team_id);

        if(!leader){

            throw new Error("Líder não encontrado.");}

        // Quem chamou é realmente o líder?
        if(leader.user_id !== leaderId){

            throw new Error(
                "Sem permissão."
            );

        }

        // Não pode transferir para si mesmo
        if(member.user_id === leaderId){

            throw new Error("Você já é o líder.");}

        // Capitão atual
        const captain = await findCaptain(member.team_id);

        // Se existir capitão,
        // ele volta para player
        if(captain){

            await updateMemberRoleByUser( member.team_id, captain.user_id, "player", connection);

        }

        // Líder vira capitão
        await updateMemberRoleByUser(member.team_id, leader.user_id, "captain", connection);

        // Novo líder
        await updateMemberRoleByUser( member.team_id, member.user_id, "leader", connection);

        await connection.commit();

        return{mensagem:"Liderança transferida com sucesso."};

    }

    catch(err){await connection.rollback();throw err;}

    finally{connection.release();}

}

/**
 * Expulsar membro
 */
export async function kickMember(leaderId, memberId){

    // Membro existe?
    const member = await findMember(memberId);

    if(!member){

        throw new Error(

            "Membro não encontrado."

        );

    }

    // Quem está expulsando é líder?
    const leader = await isLeader(

        leaderId,

        member.team_id

    );

    if(!leader){

        throw new Error(

            "Sem permissão."

        );

    }

    // Não pode expulsar a si mesmo
    if(member.user_id === leaderId){

        throw new Error(

            "Você não pode remover a si mesmo."

        );

    }

    // Não pode expulsar o líder
    if(member.cargo === "leader"){

        throw new Error(

            "O líder deve transferir a liderança antes de sair."

        );

    }

    await removeMember(member.id);

    return{

        mensagem:"Membro removido com sucesso."

    };

}