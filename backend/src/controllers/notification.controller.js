import {
    getNotifications
}

from "../services/notification.service.js";

/**
 * Minhas notificações
 */
export async function myNotifications(req, res){

    try{

        const notifications = await getNotifications(req.user.id);

        return res.json(notifications);

    }

    catch(err){

        return res.status(400).json({erro: err.message});}

}

import { clearNotifications, deleteNotification, markAllNotificationsRead, markNotificationRead } from "../models/notification.model.js";

export async function readNotification(req, res) {
    await markNotificationRead(req.user.id, req.params.id);
    return res.json({ mensagem:"Notificacao marcada como lida." });
}
export async function readAllNotifications(req, res) {
    await markAllNotificationsRead(req.user.id);
    return res.json({ mensagem:"Notificacoes marcadas como lidas." });
}
export async function removeNotification(req, res) {
    await deleteNotification(req.user.id, req.params.id);
    return res.json({ mensagem:"Notificacao removida." });
}
export async function removeAllNotifications(req, res) {
    await clearNotifications(req.user.id);
    return res.json({ mensagem:"Notificacoes removidas." });
}
