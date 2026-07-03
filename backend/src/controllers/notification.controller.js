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