'use strict';
require('dotenv').config();

const express = require('express');
const { Telegraf, Scenes, session } = require('telegraf');

const pool = require('./db/pool');
const { attachUser } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const { startHandler, roleSelectHandler } = require('./handlers/startHandler');
const { createOrderWizard } = require('./handlers/createOrderWizard');
const { myOrdersHandler } = require('./handlers/clientHandler');
const { takeOrderHandler, subscribeMockHandler, mySubscriptionHandler, statusHandler } = require('./handlers/masterHandler');

// ── Validate ENV ──────────────────────────────────────────────
const { BOT_TOKEN, WEBHOOK_URL, PORT = 3000 } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');
if (!WEBHOOK_URL) throw new Error('WEBHOOK_URL is required');

// ── Bot setup ─────────────────────────────────────────────────
const bot = new Telegraf(BOT_TOKEN);

// Stage (wizard scenes)
const stage = new Scenes.Stage([createOrderWizard]);

bot.use(session());
bot.use(stage.middleware());
bot.use(attachUser);

// ── Commands ─────────────────────────────────────────────────
bot.command('start', startHandler);

// ── Callbacks ────────────────────────────────────────────────
bot.action(/^role:(client|master)$/, roleSelectHandler);
bot.action(/^take_order:(\d+)$/, takeOrderHandler);
bot.action(/^subscribe:mock$/, subscribeMockHandler);

// ── Text menu ─────────────────────────────────────────────────
bot.hears('📝 Создать заказ', async (ctx) => {
    if (ctx.dbUser?.role !== 'client') return ctx.reply('Только для клиентов.');
    await ctx.scene.enter('create_order');
});
bot.hears('📋 Мои заказы', myOrdersHandler);
bot.hears('💳 Моя подписка', mySubscriptionHandler);
bot.hears('📊 Статус', statusHandler);

// ── Error handler ─────────────────────────────────────────────
bot.catch(errorHandler);

// ── Express webhook server ────────────────────────────────────
const app = express();
app.use(express.json());

// Health check for Render
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Telegram webhook endpoint
const webhookPath = `/telegraf/${BOT_TOKEN}`;
app.use(bot.webhookCallback(webhookPath));

// ── Boot ──────────────────────────────────────────────────────
async function bootstrap() {
    // Verify DB connection
    await pool.query('SELECT 1');
    console.log('[boot] Database connected');

    // Register webhook
    const webhookFullUrl = `${WEBHOOK_URL}${webhookPath}`;
    await bot.telegram.setWebhook(webhookFullUrl);
    console.log(`[boot] Webhook set: ${webhookFullUrl}`);

    app.listen(PORT, () => {
        console.log(`[boot] Express server listening on port ${PORT}`);
    });
}

bootstrap().catch(err => {
    console.error('[boot] Fatal error:', err.message);
    process.exit(1);
});
