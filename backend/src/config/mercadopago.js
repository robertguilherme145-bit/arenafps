import { MercadoPagoConfig } from "mercadopago";

console.log("TOKEN:", process.env.MP_ACCESS_TOKEN);

const client = new MercadoPagoConfig({

    accessToken: process.env.MP_ACCESS_TOKEN

});

export default client;