import pool from "../config/database.js";

/**
 * Criar pagamento
 */
export async function createPayment({

    entry_id,
    provider = "mercadopago",
    payment_id = null,
    external_reference = null,
    status = "pendente",
    valor,
    qr_code = null,
    qr_code_base64 = null,
    copia_cola = null,
    paid_at = null

}){

    const [result] = await pool.query(

        `
        INSERT INTO payments
        (

            entry_id,
            provider,
            payment_id,
            external_reference,
            status,
            valor,
            qr_code,
            qr_code_base64,
            copia_cola,
            paid_at

        )

        VALUES

        (

            ?,?,?,?,?,?,?,?,?,?

        )
        `,

        [

            entry_id,
            provider,
            payment_id,
            external_reference,
            status,
            valor,
            qr_code,
            qr_code_base64,
            copia_cola,
            paid_at

        ]

    );

    return {

        id: result.insertId,

        entry_id,
        provider,
        payment_id,
        external_reference,
        status,
        valor,
        qr_code,
        qr_code_base64,
        copia_cola,
        paid_at

    };

}

/**
 * Buscar pagamento pelo ID
 */
export async function findPayment(id){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM payments
        WHERE id = ?
        LIMIT 1
        `,

        [id]

    );

    return rows[0];

}

/**
 * Buscar pagamento da inscrição
 */
export async function findPaymentByEntry(entry_id){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM payments
        WHERE entry_id = ?
        LIMIT 1
        `,

        [entry_id]

    );

    return rows[0];

}

/**
 * Buscar pagamento pela referência externa
 */
export async function findPaymentByExternalReference(external_reference){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM payments
        WHERE external_reference = ?
        LIMIT 1
        `,

        [external_reference]

    );

    return rows[0];

}

/**
 * Atualizar pagamento
 */
export async function updatePaymentStatus(

    id,

    {

        payment_id,
        status,
        paid_at

    }

){

    await pool.query(

        `
        UPDATE payments
        SET

            payment_id = ?,
            status = ?,
            paid_at = ?

        WHERE id = ?
        `,

        [

            payment_id,
            status,
            paid_at,
            id

        ]

    );

}

/**
 * Atualizar dados PIX
 */
export async function updatePixData(

    id,

    {

        payment_id,
        external_reference,
        qr_code,
        qr_code_base64,
        copia_cola

    }

){

    await pool.query(

        `
        UPDATE payments
        SET

            payment_id = ?,
            external_reference = ?,
            qr_code = ?,
            qr_code_base64 = ?,
            copia_cola = ?

        WHERE id = ?
        `,

        [

            payment_id,
            external_reference,
            qr_code,
            qr_code_base64,
            copia_cola,
            id

        ]

    );

}