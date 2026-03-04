'use strict';
const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// Protect with a secret token from ENV
// Set ADMIN_SECRET=your_random_secret in .env
function checkSecret(req, res, next) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret || req.query.secret !== secret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

function toCSV(columns, rows) {
    const header = columns.join(',');
    const lines = rows.map(row =>
        columns.map(col => {
            const val = row[col] ?? '';
            // Escape commas and quotes
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
    );
    return [header, ...lines].join('\n');
}

// GET /admin/export/users?secret=xxx
router.get('/export/users', checkSecret, async (req, res) => {
    const { rows } = await pool.query(
        'SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC'
    );
    const csv = toCSV(['id', 'username', 'full_name', 'role', 'created_at'], rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send('\uFEFF' + csv); // BOM for correct Excel encoding
});

// GET /admin/export/orders?secret=xxx
router.get('/export/orders', checkSecret, async (req, res) => {
    const { rows } = await pool.query(`
    SELECT
      o.id, o.status, o.category, o.description,
      o.price_type, o.price,
      c.full_name  AS client_name,  c.username AS client_username,
      m.full_name  AS master_name,  m.username AS master_username,
      o.created_at
    FROM orders o
    JOIN users c ON c.id = o.client_id
    LEFT JOIN users m ON m.id = o.master_id
    ORDER BY o.created_at DESC
  `);
    const columns = [
        'id', 'status', 'category', 'description',
        'price_type', 'price',
        'client_name', 'client_username',
        'master_name', 'master_username',
        'created_at'
    ];
    const csv = toCSV(columns, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send('\uFEFF' + csv);
});

// GET /admin/stats?secret=xxx  — быстрая сводка
router.get('/stats', checkSecret, async (req, res) => {
    const [clients, masters, orders, activeSubs] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'"),
        pool.query("SELECT COUNT(*) FROM users WHERE role = 'master'"),
        pool.query('SELECT status, COUNT(*) FROM orders GROUP BY status'),
        pool.query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND expires_at > NOW()"),
    ]);

    res.json({
        clients: parseInt(clients.rows[0].count),
        masters: parseInt(masters.rows[0].count),
        active_subs: parseInt(activeSubs.rows[0].count),
        orders_by_status: Object.fromEntries(
            orders.rows.map(r => [r.status, parseInt(r.count)])
        ),
    });
});

module.exports = router;
