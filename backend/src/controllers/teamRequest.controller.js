import {requestJoinTeam, listRequests, acceptRequest}

from "../services/teamRequest.service.js";

/**
 * Solicitar entrada na equipe
 */
export async function request(req, res){

    try{

        const resultado = await requestJoinTeam(

            req.user.id,

            req.params.teamId

        );

        return res.status(201).json(resultado);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}

/**
 * Listar solicitações
 */
export async function index(req,res){

    try{

        const requests = await listRequests(

            req.user.id,

            req.params.teamId

        );

        return res.json(requests);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}

/**
 * Aceitar solicitação
 */
export async function accept(req,res){

    try{

        const resultado = await acceptRequest(

            req.user.id,

            req.params.id

        );

        return res.json(resultado);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}