import {registerTeam, listMembers, getMyTeams, getTeam}
from "../services/team.service.js";

/**
 * Criar equipe
 */
export async function create(req,res){

    try{

        const team = await registerTeam(

            req.user.id,

            req.body

        );

        return res.status(201).json(team);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}

/**
 * Listar membros da equipe
 */
export async function members(req,res){

    console.log("params:", req.params);
    console.log("user:", req.user.id);

    try{

        const resultado = await listMembers(

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

/**
 * Minha equipe
 */
export async function me(req,res){

    try{

        const resultado = await getMyTeams(req.user.id);

        return res.json(resultado);

    }

    catch(err){

        return res.status(400).json({erro: err.message});

    }

}

/**
 * Buscar equipe
 */
export async function show(req,res){

    try{

        const team = await getTeam(req.params.id);

        return res.json(team);

    }

    catch(err){

        return res.status(404).json({erro: err.message});

    }

}