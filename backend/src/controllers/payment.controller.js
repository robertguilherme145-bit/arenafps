import {

    createEntryPayment

} from "../services/payment.service.js";

/**
 * Criar pagamento
 */
export async function create(req,res){

    try{

        const payment = await createEntryPayment(

            req.user.id,
            
            req.params.entryId

        );

        return res.status(201).json(payment);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}

/**
 * Webhook Mercado Pago
 */
export async function webhook(req,res){

    console.log(req.body);

    return res.sendStatus(200);

}