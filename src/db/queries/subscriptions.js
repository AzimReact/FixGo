'use strict';
const pool = require('../pool');

/**
 * Check if master has an active subscription
 */
async function hasActiveSubscription(masterId) {
    const { rows } = await pool.query(
        `SELECT id FROM subscriptions
     WHERE master_id = $1
       AND status = 'active'
       AND expires_at > NOW()
     LIMIT 1`,
        [masterId]
    );
    return rows.length > 0;
}

/**
 * Create a MOCK subscription (no real payment)
 */
async function createMockSubscription(masterId) {
    const { rows } = await pool.query(
        `INSERT INTO subscriptions (master_id, status, plan, payment_method)
     VALUES ($1, 'active', 'monthly', 'mock')
     RETURNING *`,
        [masterId]
    );
    return rows[0];
}

/**
 * Create a subscription after a real Telegram payment
 * @param {string} paymentRef - Telegram charge_id
 */
async function createPaidSubscription(masterId, paymentRef, method = 'telegram_stars') {
    const { rows } = await pool.query(
        `INSERT INTO subscriptions (master_id, status, plan, payment_method, payment_ref)
     VALUES ($1, 'active', 'monthly', $2, $3)
     RETURNING *`,
        [masterId, method, paymentRef]
    );
    return rows[0];
}

async function getSubscription(masterId) {
    const { rows } = await pool.query(
        `SELECT * FROM subscriptions
     WHERE master_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
        [masterId]
    );
    return rows[0] || null;
}

module.exports = {
    hasActiveSubscription,
    createMockSubscription,
    createPaidSubscription,
    getSubscription,
};
