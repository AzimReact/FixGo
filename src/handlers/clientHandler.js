'use strict';
const { Markup } = require('telegraf');
const ordersDb = require('../db/queries/orders');

const STATUS_LABELS = {
    open: '🟡 Открыт',
    taken: '🟢 Взят мастером',
    in_progress: '🔵 В работе',
    done: '✅ Выполнен',
    cancelled: '❌ Отменён',
};

/**
 * "Мои заказы" text button handler
 */
async function myOrdersHandler(ctx) {
    const orders = await ordersDb.getOrdersByClient(ctx.from.id);

    if (!orders.length) {
        return ctx.reply(
            '📭 У вас ещё нет заказов.\n\nНажмите «📝 Создать заказ».'
        );
    }

    const lines = orders.map(o => {
        const priceText = o.price_type === 'fixed' ? `${o.price} ₽` : 'Договорная';
        const masterText = o.master_name ? `👨‍🔧 ${o.master_name}` : '⏳ Ожидает мастера';
        return (
            `🆔 Заказ #${o.id}\n` +
            `📂 ${o.category}\n` +
            `${STATUS_LABELS[o.status]}\n` +
            `💰 ${priceText}\n` +
            `${masterText}\n`
        );
    });

    return ctx.reply(
        `📋 <b>Ваши заказы (${orders.length})</b>\n\n` + lines.join('\n─────────────\n'),
        { parse_mode: 'HTML' }
    );
}

module.exports = { myOrdersHandler };
