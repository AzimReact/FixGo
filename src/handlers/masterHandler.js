'use strict';
const { Markup } = require('telegraf');
const usersDb = require('../db/queries/users');
const subscriptionSvc = require('../services/subscriptionService');
const orderSvc = require('../services/orderService');

/**
 * Master clicks "Взять заказ" inline button
 * callback_data = "take_order:<orderId>"
 */
async function takeOrderHandler(ctx) {
    await ctx.answerCbQuery('Обрабатываю...');

    const master = await usersDb.findById(ctx.from.id);
    if (!master || master.role !== 'master') {
        return ctx.answerCbQuery('Только мастера могут брать заказы.', { show_alert: true });
    }

    const hasSub = await subscriptionSvc.getSubscriptionStatus(master.id);
    if (!hasSub.isActive) {
        return ctx.telegram.sendMessage(
            ctx.from.id,
            '❌ У вас нет активной подписки. Оформите подписку, чтобы брать заказы.',
            Markup.inlineKeyboard([[
                Markup.button.callback('💳 Оформить подписку', 'subscribe:mock'),
            ]])
        );
    }

    const orderId = parseInt(ctx.match[1], 10);
    const result = await orderSvc.claimOrder({ telegram: ctx.telegram }, orderId, master.id);

    if (!result.success) {
        return ctx.answerCbQuery('😔 Заказ уже взят другим мастером.', { show_alert: true });
    }

    // Remove inline button from the broadcast message
    await ctx.editMessageText(
        ctx.callbackQuery.message.text + '\n\n✅ <b>Вы взяли этот заказ</b>',
        { parse_mode: 'HTML' }
    ).catch(() => { }); // ignore if message is too old
}

/**
 * Master subscribes (mock)
 */
async function subscribeMockHandler(ctx) {
    await ctx.answerCbQuery();

    const result = await subscriptionSvc.activateMockSubscription(ctx.from.id);
    if (result.alreadyActive) {
        return ctx.reply('✅ У вас уже есть активная подписка!');
    }

    const sub = result.subscription;
    const expiresAt = new Date(sub.expires_at).toLocaleDateString('ru-RU');
    await ctx.reply(
        `✅ <b>Подписка активирована!</b>\n\n` +
        `📅 Действует до: ${expiresAt}\n` +
        `💳 Способ оплаты: Mock (бесплатно)\n\n` +
        `Теперь вы будете получать новые заказы.`,
        { parse_mode: 'HTML' }
    );
}

/**
 * "Моя подписка" text button
 */
async function mySubscriptionHandler(ctx) {
    const status = await subscriptionSvc.getSubscriptionStatus(ctx.from.id);

    if (!status.isActive) {
        return ctx.reply(
            '❌ У вас нет активной подписки.\n\nОформите подписку, чтобы получать заказы:',
            Markup.inlineKeyboard([[
                Markup.button.callback('💳 Активировать (Mock)', 'subscribe:mock'),
            ]])
        );
    }

    const sub = status.subscription;
    const expiresAt = new Date(sub.expires_at).toLocaleDateString('ru-RU');
    return ctx.reply(
        `✅ <b>Подписка активна</b>\n\n` +
        `📅 До: ${expiresAt}\n` +
        `💳 Метод: ${sub.payment_method}`,
        { parse_mode: 'HTML' }
    );
}

module.exports = { takeOrderHandler, subscribeMockHandler, mySubscriptionHandler };
