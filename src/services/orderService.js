'use strict';
const usersDb = require('../db/queries/users');
const ordersDb = require('../db/queries/orders');
const subscriptionsDb = require('../db/queries/subscriptions');

const CATEGORY_LABELS = {
    plumbing: '🔧 Сантехника',
    electrical: '⚡ Электрика',
    other: '🔨 Другое',
};

/**
 * Dispatch a new order to all active-subscribed masters
 * @param {object} bot  - Telegraf bot instance
 * @param {object} order - order row from DB
 */
async function dispatchOrderToMasters(bot, order) {
    const masters = await usersDb.getAllMasters();

    const priceText = order.price_type === 'fixed'
        ? `💰 ${order.price} ₽`
        : '💬 Договорная';

    const text =
        `📋 <b>Новый заказ #${order.id}</b>\n\n` +
        `📂 Категория: ${CATEGORY_LABELS[order.category]}\n` +
        `📝 Описание: ${order.description}\n` +
        `${priceText}`;

    const sentCount = { ok: 0, skip: 0 };

    await Promise.allSettled(
        masters.map(async (master) => {
            const hasSub = await subscriptionsDb.hasActiveSubscription(master.id);
            if (!hasSub) {
                sentCount.skip++;
                return;
            }
            await bot.telegram.sendMessage(master.id, text, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [[
                        { text: '✅ Взять заказ', callback_data: `take_order:${order.id}` },
                    ]],
                },
            });
            sentCount.ok++;
        })
    );

    console.log(`[orderService] Order #${order.id} dispatched: ${sentCount.ok} sent, ${sentCount.skip} skipped (no sub)`);
}

/**
 * Handle a master clicking "Взять заказ"
 * Returns { success, order, client, master } or { success: false, reason }
 */
async function claimOrder(bot, orderId, masterId) {
    const order = await ordersDb.takeOrder(orderId, masterId);
    if (!order) {
        return { success: false, reason: 'already_taken' };
    }

    const [client, master] = await Promise.all([
        usersDb.findById(order.client_id),
        usersDb.findById(masterId),
    ]);

    // Notify master
    const clientContact = client.username
        ? `@${client.username}`
        : `<a href="tg://user?id=${client.id}">${client.full_name}</a>`;

    await bot.telegram.sendMessage(
        masterId,
        `🎉 <b>Заказ #${order.id} ваш!</b>\n\n` +
        `👤 Клиент: ${clientContact}\n` +
        `📝 ${order.description}\n` +
        `💰 ${order.price_type === 'fixed' ? `${order.price} ₽` : 'Договорная'}`,
        { parse_mode: 'HTML' }
    );

    // Notify client
    const masterContact = master.username
        ? `@${master.username}`
        : `<a href="tg://user?id=${master.id}">${master.full_name}</a>`;

    await bot.telegram.sendMessage(
        order.client_id,
        `✅ <b>Мастер нашёлся!</b>\n\n` +
        `По вашему заказу #${order.id} откликнулся мастер: ${masterContact}\n` +
        `Он скоро с вами свяжется.`,
        { parse_mode: 'HTML' }
    );

    return { success: true, order, client, master };
}

module.exports = { dispatchOrderToMasters, claimOrder, CATEGORY_LABELS };
