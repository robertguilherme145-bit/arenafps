import { Payment } from "mercadopago";
import crypto from "crypto";

import client from "../config/mercadopago.js";

const payment = new Payment(client);

/**
 * Criar pagamento PIX
 */
export async function createPixPayment({

    valor,
    descricao,
    email,
    cpf,
    externalReference

}){

    console.log({

        valor,
        descricao,
        email,
        cpf,
        externalReference

    });

    try{

        const response = await payment.create({

            body:{

                transaction_amount: Number(valor),

                description: descricao,

                payment_method_id: "pix",

                external_reference: externalReference,

                payer:{

                    email,

                    identification:{

                        type:"CPF",

                        number: cpf

                    }

                }

            },

            requestOptions:{

                idempotencyKey: crypto.randomUUID()

            }

        });

        console.log(
            JSON.stringify(
                response,
                null,
                2
            )
        );

        console.log("RESPOSTA PIX:");
        console.dir(response, { depth: null });

        return response;

    }

    catch (err) {

        console.error("=========== MERCADO PAGO ===========");

        console.dir(err, { depth: null });

        if (err?.api_response) {
            console.log("API RESPONSE:");
            console.dir(err.api_response, { depth: null });
        }

        if (err?.response) {
            console.log("RESPONSE:");
            console.dir(err.response, { depth: null });
        }

        throw err;

    }

}

/**
 * Buscar pagamento no Mercado Pago
 */
export async function getPayment(paymentId){

    try{

        const response = await payment.get({

            id: paymentId

        });

        return response;

    }

    catch(err){

        console.error("Erro ao consultar pagamento:");

        console.dir(err,{ depth:null });

        throw err;

    }

}