'use strict';
const { Markup } = require('telegraf');
const usersDb = require('../db/queries/users');

/**
 * /start command handler
 * Asks user to choose a role if not registered yet
 */
async function startHandler(ctx) {
    const user = await usersDb.findById(ctx.from.id);
    if (user) {
        return ctx.reply(
            `👋 С возвращением, ${user.full_name}!\n` +
            `Ваша роль: ${user.role === 'client' ? '👤 Клиент' : '🔧 Мастер'}`,
            mainMenu(user.role)
        );
    }

    return ctx.reply(
        '👋 Добро пожаловать в <b>FixGo</b> — маркетплейс услуг!\n\n' +
        'Кто вы?',
        {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('👤 Я клиент', 'role:client')],
                [Markup.button.callback('🔧 Я мастер', 'role:master')],
            ]),
        }
    );
}

function mainMenu(role) {
    if (role === 'client') {
        return Markup.keyboard([
            ['📝 Создать заказ'],
            ['📋 Мои заказы'],
        ]).resize();
    }
    return Markup.keyboard([
        ['💳 Моя подписка'],
        ['📊 Статус'],
    ]).resize();
}

/**
 * Callback: user selected a role
 */
async function roleSelectHandler(ctx) {
    await ctx.answerCbQuery();
    const role = ctx.match[1]; // 'client' | 'master'
    const from = ctx.from;
    const full_name = [from.first_name, from.last_name].filter(Boolean).join(' ');

    await usersDb.upsertUser({
        id: from.id,
        username: from.username || null,
        full_name,
        role,
    });

    const roleLabel = role === 'client' ? '👤 Клиент' : '🔧 Мастер';
    await ctx.editMessageText(
        `✅ Вы зарегистрированы как <b>${roleLabel}</b>!`,
        { parse_mode: 'HTML' }
    );
    await ctx.reply('Главное меню:', mainMenu(role));
}

module.exports = { startHandler, roleSelectHandler, mainMenu };
