'use strict';
const pool = require('../pool');

/**
 * @param {object} p
 * @param {number} p.id         - Telegram user_id
 * @param {string} p.username
 * @param {string} p.full_name
 * @param {string} p.role       - 'client' | 'master'
 */
async function upsertUser({ id, username, full_name, role }) {
    const { rows } = await pool.query(
        `INSERT INTO users (id, username, full_name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET username  = EXCLUDED.username,
           full_name = EXCLUDED.full_name
     RETURNING *`,
        [id, username, full_name, role]
    );
    return rows[0];
}

async function findById(id) {
    const { rows } = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );
    return rows[0] || null;
}

async function updateUserPhone(id, phone) {
    const { rows } = await pool.query(
        'UPDATE users SET phone = $1 WHERE id = $2 RETURNING *',
        [phone, id]
    );
    return rows[0];
}

async function getAllMasters() {
    const { rows } = await pool.query(
        "SELECT * FROM users WHERE role = 'master' AND is_banned = FALSE"
    );
    return rows;
}

async function banUser(id) {
    const { rows } = await pool.query(
        'UPDATE users SET is_banned = TRUE WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0];
}

async function unbanUser(id) {
    const { rows } = await pool.query(
        'UPDATE users SET is_banned = FALSE WHERE id = $1 RETURNING *',
        [id]
    );
    return rows[0];
}

async function deleteUser(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

async function getAllUsers() {
    const { rows } = await pool.query(
        'SELECT * FROM users ORDER BY created_at DESC'
    );
    return rows;
}

module.exports = { upsertUser, findById, updateUserPhone, getAllMasters, banUser, unbanUser, deleteUser, getAllUsers };
