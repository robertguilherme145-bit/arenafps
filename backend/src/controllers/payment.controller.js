import {createEntryPayment, processWebhook} from "../services/payment.service.js";

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

    try{

        console.log(req.body);

        if(req.body?.data?.id){

            await processWebhook(

                req.body.data.id

            );

        }

        return res.sendStatus(200);

    }

    catch(err){

        console.error(err);

        return res.sendStatus(500);

    }

}