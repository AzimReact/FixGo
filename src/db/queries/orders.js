'use strict';
const pool = require('../pool');

/**
 * Create a new order
 */
async function createOrder({ client_id, category, description, price_type, price }) {
    const { rows } = await pool.query(
        `INSERT INTO orders (client_id, category, description, price_type, price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [client_id, category, description, price_type, price ?? null]
    );
    return rows[0];
}

/**
 * Take an order atomically — защита от race condition через SELECT FOR UPDATE
 * @returns {object|null} order — если взяли, null — если уже занят
 */
async function takeOrder(orderId, masterId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lock the row so concurrent transactions wait
        const { rows } = await client.query(
            `SELECT * FROM orders
       WHERE id = $1 AND status = 'open'
       FOR UPDATE`,
            [orderId]
        );

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return null; // already taken or doesn't exist
        }

        const { rows: updated } = await client.query(
            `UPDATE orders
       SET master_id = $1, status = 'taken'
       WHERE id = $2
       RETURNING *`,
            [masterId, orderId]
        );

        await client.query('COMMIT');
        return updated[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function findById(orderId) {
    const { rows } = await pool.query(
        'SELECT * FROM orders WHERE id = $1',
        [orderId]
    );
    return rows[0] || null;
}

async function getOrdersByClient(clientId) {
    const { rows } = await pool.query(
        `SELECT o.*, u.full_name AS master_name, u.username AS master_username
     FROM orders o
     LEFT JOIN users u ON u.id = o.master_id
     WHERE o.client_id = $1
     ORDER BY o.created_at DESC`,
        [clientId]
    );
    return rows;
}

module.exports = { createOrder, takeOrder, findById, getOrdersByClient };
