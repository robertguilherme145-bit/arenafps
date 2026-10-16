import {createEntryPayment, processWebhook} from "../services/payment.service.js";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";

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
 * Em producao, webhook sem assinatura so e aceito se houver MP_WEBHOOK_SECRET.
 * Sem o segredo, a conciliacao automatica (paymentReconciliation) confirma os pagamentos.
 */
export function acceptsUnsignedWebhook(environment){

    return environment.NODE_ENV !== "production";

}

let missingSecretWarned = false;
function warnMissingSecret(){

    if(missingSecretWarned) return;
    missingSecretWarned = true;
    console.warn("MP_WEBHOOK_SECRET ausente: webhooks do Mercado Pago sem assinatura sao ignorados; a conciliacao automatica segue confirmando pagamentos.");

}

/**
 * Webhook Mercado Pago
 */
export async function webhook(req,res){

    try{

        const type = String(req.body?.type ?? req.query?.type ?? "payment");
        if(type !== "payment") return res.sendStatus(200);

        const dataId = String(
            req.query?.["data.id"] ??
            req.body?.data?.id ??
            req.query?.id ??
            ""
        ).trim();

        if(!/^\d+$/.test(dataId)) return res.sendStatus(200);

        if(!process.env.MP_WEBHOOK_SECRET && !acceptsUnsignedWebhook(process.env)){
            warnMissingSecret();
            return res.sendStatus(202);
        }

        if(process.env.MP_WEBHOOK_SECRET){
            WebhookSignatureValidator.validate({
                xSignature: req.headers["x-signature"],
                xRequestId: req.headers["x-request-id"],
                dataId,
                secret: process.env.MP_WEBHOOK_SECRET,
                toleranceSeconds: 300
            });
        }

        await processWebhook(dataId);

        return res.sendStatus(200);

    }

    catch(err){

        if(err instanceof InvalidWebhookSignatureError){
            console.warn("Webhook do Mercado Pago rejeitado:", err.reason);
            return res.sendStatus(401);
        }

        console.error("Falha ao processar webhook do Mercado Pago:", err.message);

        return res.sendStatus(500);

    }

}
