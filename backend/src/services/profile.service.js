import {findProfile, updateProfile}

from "../models/profile.model.js";

/**
 * Buscar perfil
 */
export async function getProfile(userId){

    const profile = await findProfile(userId);

    if(!profile){

        throw new Error("Perfil não encontrado.");

    }

    return profile;

}

/**
 * Atualizar perfil
 */
export async function editProfile(userId, dados){

    // Nickname obrigatório
    if(!dados.nickname){

        throw new Error("Nickname é obrigatório.");

    }

    if(dados.nickname.length < 3){

        throw new Error(

            "O nickname deve possuir pelo menos 3 caracteres."

        );

    }

    if(dados.nickname.length > 50){

        throw new Error(

            "O nickname deve possuir no máximo 50 caracteres."

        );

    }

    await updateProfile(userId, dados

    );

    return{mensagem:"Perfil atualizado com sucesso."};

}