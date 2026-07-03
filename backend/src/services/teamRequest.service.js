import pool from "../config/database.js";

import {createRequest, findPendingRequest, getPendingRequests, findRequest, updateRequestStatus}

from "../models/teamRequest.model.js";

import {findTeam, isLeader, isMember, addMember}

from "../models/team.model.js";

import {findUserById}

from "../models/user.model.js";

/**
 * Solicitar entrada em uma equipe
 */
export async function requestJoinTeam(userId, teamId){

    // Usuário existe?
    const usuario = await findUserById(userId);

    if(!usuario){

        throw new Error(

            "Usuário não encontrado."

        );

    }

    // Equipe existe?
    const team = await findTeam(teamId);

    if(!team){

        throw new Error(

            "Equipe não encontrada."

        );

    }

    // Já existe solicitação?
    const pending = await findPendingRequest(

        teamId,

        userId,

        "request"

    );

    if(pending){

        throw new Error(

            "Você já solicitou entrada nesta equipe."

        );

    }

    return await createRequest({

        team_id: teamId,

        user_id: userId,

        tipo: "request"

    });

}

/**
 * Listar solicitações da equipe
 */
export async function listRequests(userId, teamId){

    // Usuário existe?
    const usuario = await findUserById(userId);

    if(!usuario){

        throw new Error(

            "Usuário não encontrado."

        );

    }

    // Equipe existe?
    const team = await findTeam(teamId);

    if(!team){

        throw new Error(

            "Equipe não encontrada."

        );

    }

    // É líder?
    const leader = await isLeader(

        userId,

        teamId

    );

    if(!leader){

        throw new Error(

            "Sem permissão."

        );

    }

    return await getPendingRequests(teamId);

}

/**
 * Aceitar solicitação
 */
export async function acceptRequest(leaderId, requestId){

    const connection = await pool.getConnection();

    try{

        await connection.beginTransaction();

        // Busca solicitação
        const request = await findRequest(requestId);

        if(!request){

            throw new Error(
                "Solicitação não encontrada."
            );

        }

        // Ainda está pendente?
        if(request.status !== "pending"){

            throw new Error(
                "Esta solicitação já foi processada."
            );

        }

        // Busca equipe
        const team = await findTeam(

            request.team_id

        );

        if(!team){

            throw new Error(
                "Equipe não encontrada."
            );

        }

        // Verifica se é líder
        const leader = await isLeader(

            leaderId,

            team.id

        );

        if(!leader){

            throw new Error(
                "Sem permissão."
            );

        }

        // Já pertence à equipe?
        const member = await isMember(

            request.user_id,

            team.id

        );

        if(member){

            throw new Error(
                "Usuário já pertence à equipe."
            );

        }

        // Adiciona membro
        await addMember(

            {team_id: team.id, user_id: request.user_id, cargo: "player"},

            connection);

        // Atualiza solicitação
        await updateRequestStatus(request.id, "accepted", connection);

        await connection.commit();

        return {mensagem: "Solicitação aceita com sucesso."};

    }

    catch(err){

        await connection.rollback();
        throw err;}

    finally{connection.release();}

}