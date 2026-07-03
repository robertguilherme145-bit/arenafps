import {findUserById} from "../models/user.model.js";

import { findUserTeam } from "../models/team.model.js";

import {createPayment, findPaymentByEntry, findPaymentByExternalReference, updatePaymentStatus} from "../models/payment.model.js";

import {findEntry, updatePaymentStatus as updateEntryPaymentStatus ,updateEntryStatus} from "../models/entry.model.js";


import {findTournament} from "../models/tournament.model.js";


import {createPixPayment, getPayment} from "./mercadopago.service.js";

/**
 * Criar pagamento da inscrição
 */
export async function createEntryPayment(userId, entryId){

    // Descobre a Equipe do líder
    const team = await findUserTeam(userId);

    if(!team){

        throw new Error(
            "Equipe não encontrada."
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
    
    if(entry.team_id !== team.id){

        throw new Error(
            "Esta inscrição não pertence à sua equipe."
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

/**
 * Processar Webhook
 */
export async function processWebhook(paymentId){

    const payment = await getPayment(paymentId);

    console.log({
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference});

    const pagamento = await findPaymentByExternalReference(payment.external_reference);

    if(!pagamento){

        return;

    }
    let statusBanco = "pendente";

    switch (payment.status) {

        case "approved":
            statusBanco = "aprovado";
            break;

        case "pending":
            statusBanco = "pendente";
            break;

        case "cancelled":
            statusBanco = "cancelado";
            break;

        case "rejected":
            statusBanco = "rejeitado";
            break;

    }

    await updatePaymentStatus(

        pagamento.id,

        {

            payment_id: String(payment.id),

            status: statusBanco,

            paid_at:

                payment.status === "approved"

                    ? new Date()

                    : null

        }

    );

    if(payment.status === "approved"){

        await updateEntryPaymentStatus(pagamento.entry_id, "pago");

        await updateEntryStatus(pagamento.entry_id, "confirmado");

        console.log("✅ Inscrição confirmada!");

    }
}