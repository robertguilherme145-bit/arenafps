import {

    findUserById

} from "../models/user.model.js";

import {
    findClanByLeader
} from "../models/clan.model.js";

import {

    createPayment,
    findPaymentByEntry

} from "../models/payment.model.js";

import {

    findEntry

} from "../models/entry.model.js";


import {

    findTournament

} from "../models/tournament.model.js";
import { createPixPayment } from "./mercadopago.service.js";

/**
 * Criar pagamento da inscrição
 */
export async function createEntryPayment(userId, entryId){

    // Descobre o clã do líder
    const clan = await findClanByLeader(userId);

    if(!clan){

        throw new Error(
            "Clã não encontrado."
        );

    }

    const usuario = await findUserById(userId);

    if(!usuario){

        throw new Error(
            "Usuário não encontrado."
        );

    }
    
    // Busca inscrição
    const entry = await findEntry(entryId);

    if(!entry){

        throw new Error(

            "Inscrição não encontrada."

        );

    }
    
    if(entry.clan_id !== clan.id){

        throw new Error(
            "Esta inscrição não pertence ao seu clã."
        );

    }


    // Verifica se já existe pagamento
    const existingPayment = await findPaymentByEntry(

        entry.id

    );

    if(existingPayment){

        throw new Error(

            "Já existe um pagamento para esta inscrição."

        );

    }

    // Busca torneio
    const tournament = await findTournament(

        entry.tournament_id

    );

    if(!tournament){

        throw new Error(

            "Torneio não encontrado."

        );

    }

    // Cria pagamento
    const pix = await createPixPayment({
        
        valor: tournament.valor,

        descricao: `Inscrição - ${tournament.nome}`,

        email: usuario.email,

        cpf: usuario.cpf,

        externalReference: `ENTRY_${entryId}`
    
    });

    await createPayment({

        entry_id: entry.id,

        provider: "mercadopago",

        payment_id: String(pix.id),

        external_reference: pix.external_reference,

        status: pix.status,

        valor: pix.transaction_amount,

        qr_code: pix.point_of_interaction.transaction_data.qr_code,

        qr_code_base64: pix.point_of_interaction.transaction_data.qr_code_base64,

        copia_cola: pix.point_of_interaction.transaction_data.qr_code

    });
    return {

        payment_id: pix.id,

        status: pix.status,

        qr_code: pix.point_of_interaction.transaction_data.qr_code,

        qr_code_base64: pix.point_of_interaction.transaction_data.qr_code_base64,

        copia_cola: pix.point_of_interaction.transaction_data.qr_code

    };
}