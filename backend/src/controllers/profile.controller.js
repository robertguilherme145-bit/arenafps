import {getProfile, editProfile}

from "../services/profile.service.js";

/**
 * Buscar perfil
 */
export async function me(req, res){

    try{

        const profile = await getProfile(req.user.id);

        return res.json(profile);

    }

    catch(err){

        return res.status(404).json({erro: err.message});

    }

}

/**
 * Atualizar perfil
 */
export async function update(req, res){

    try{

        const resultado = await editProfile( req.user.id, req.body);

        return res.json(resultado);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}