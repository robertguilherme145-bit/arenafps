import {createGame, getGames, findGame, findGameBySlug, findActiveGameMaps, updateGame}

from "../models/game.model.js";

/**
 * Criar Game
 */
export async function registerGame(dados){

    const normalized = normalizeGame(dados);

    const existe = await findGameBySlug(

        normalized.slug

    );

    if(existe){

        throw new Error(

            "Já existe um jogo com este slug."

        );

    }

    return await createGame(normalized);

}

/**
 * Listar Games
 */
export async function listGames(){

    return await getGames();

}

/**
 * Buscar Game
 */
export async function getGame(id){

    const game = await findGame(id);

    if(!game){

        throw new Error(

            "Jogo não encontrado."

        );

    }

    return { ...game, maps: await findActiveGameMaps(game.id) };

}

export async function editGame(id, dados){

    const current = await getGame(id);
    const normalized = normalizeGame({ ...current, ...dados });
    const slugOwner = await findGameBySlug(normalized.slug);

    if(slugOwner && Number(slugOwner.id) !== Number(current.id)){
        throw new Error("Ja existe outro jogo com este slug.");
    }

    const next = {
        ...normalized,
        logo: dados.logo !== undefined ? dados.logo : current.logo,
        banner: dados.banner !== undefined ? dados.banner : current.banner,
        ativo: dados.ativo !== undefined ? (dados.ativo ? 1 : 0) : Number(current.ativo)
    };

    await updateGame(current.id, next);
    return { ...current, ...next };

}

function normalizeGame(dados = {}){

    const nome = String(dados.nome ?? "").trim();
    const nomeCurto = String(dados.nome_curto ?? "").trim();
    const slug = slugify(dados.slug || nome);

    if(nome.length < 2){
        throw new Error("Informe o nome completo do jogo.");
    }

    if(nomeCurto.length < 1){
        throw new Error("Informe o nome curto do jogo.");
    }

    if(!slug){
        throw new Error("Nao foi possivel gerar o slug do jogo.");
    }

    return {
        nome,
        nome_curto: nomeCurto,
        slug,
        descricao: String(dados.descricao ?? "").trim() || null,
        logo: dados.logo ?? null,
        banner: dados.banner ?? null,
        cor_primaria: String(dados.cor_primaria ?? "").trim() || null
    };

}

function slugify(value){

    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

}
