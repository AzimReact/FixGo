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

async function getAllMasters() {
    const { rows } = await pool.query(
        "SELECT * FROM users WHERE role = 'master'"
    );
    return rows;
}

module.exports = { upsertUser, findById, getAllMasters };
