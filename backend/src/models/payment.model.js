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

export async function findPaymentByGatewayId(payment_id){

    const [rows] = await pool.query(
        `SELECT * FROM payments WHERE payment_id = ? LIMIT 1`,
        [String(payment_id)]
    );

    return rows[0];

}

export async function findPendingPaymentsByTeam(team_id){

    const [rows] = await pool.query(
        `
        SELECT p.*
        FROM payments p
        INNER JOIN entries e ON e.id = p.entry_id
        WHERE e.team_id = ?
          AND p.status = 'pendente'
          AND p.payment_id IS NOT NULL
        ORDER BY p.created_at ASC
        `,
        [team_id]
    );

    return rows;

}

export async function findPendingPayments(limit = 50){

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const [rows] = await pool.query(
        `
        SELECT p.*
        FROM payments p
        WHERE p.status = 'pendente'
          AND p.payment_id IS NOT NULL
        ORDER BY p.created_at ASC
        LIMIT ?
        `,
        [safeLimit]
    );

    return rows;

}

export async function reconcileGatewayPayment(id, { payment_id, status, paid_at }){

    const connection = await pool.getConnection();

    try{

        await connection.beginTransaction();

        const [rows] = await connection.query(
            `
            SELECT
                p.*,
                e.status AS entry_status,
                e.payment_status AS entry_payment_status,
                e.tournament_id,
                e.team_id,
                t.nome AS tournament_name,
                tm.nome AS team_name,
                tm.creator_id AS team_creator_id
            FROM payments p
            INNER JOIN entries e ON e.id = p.entry_id
            INNER JOIN tournaments t ON t.id = e.tournament_id
            INNER JOIN teams tm ON tm.id = e.team_id
            WHERE p.id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [id]
        );

        const current = rows[0];
        if(!current){
            throw new Error("Pagamento local nao encontrado.");
        }

        await connection.query(
            `
            UPDATE payments
            SET payment_id = ?, status = ?, paid_at = ?
            WHERE id = ?
            `,
            [String(payment_id), status, paid_at, id]
        );

        if(status === "cancelado" || status === "rejeitado"){
            await connection.query(
                `
                UPDATE entries
                SET
                  payment_status = 'falhou',
                  status = CASE WHEN status IN ('pago','confirmado') THEN 'pendente' ELSE status END
                WHERE id = ? AND status <> 'cancelado'
                `,
                [current.entry_id]
            );
        }

        await connection.commit();

        return {
            ...current,
            previous_status: current.status,
            status,
            status_changed: current.status !== status,
            payment_id: String(payment_id),
            paid_at
        };

    }
    catch(err){

        await connection.rollback();
        throw err;

    }
    finally{

        connection.release();

    }

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
