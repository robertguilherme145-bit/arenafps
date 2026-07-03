import { getDashboard }

from "../services/dashboard.service.js";

/**
 * Dashboard do jogador
 */
export async function me(req, res){

    try{

        const dashboard = await getDashboard(req.user.id);

        return res.json(dashboard);

    }

    catch(err){

        return res.status(400).json({erro: err.message});}

}