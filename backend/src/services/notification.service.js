import {
    createNotification,
    findNotifications,
    countNotifications
}

from "../models/notification.model.js";

/**
 * Enviar notificação
 */
export async function notify({user_id, titulo, mensagem, tipo, link = null}){

    return await createNotification({

        user_id,
        titulo,
        mensagem,
        tipo,
        link

    });

}

/**
 * Listar minhas notificações
 */
export async function getNotifications(userId){

    return await findNotifications(userId);

}

/**
 * Resumo das notificações
 */
export async function getNotificationSummary(userId){

    return await countNotifications(userId);

}