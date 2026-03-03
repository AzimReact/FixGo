'use strict';
const { Scenes, Markup } = require('telegraf');
const usersDb = require('../db/queries/users');
const orderService = require('../services/orderService');

const CATEGORIES = [
    { key: 'plumbing', label: '🔧 Сантехника' },
    { key: 'electrical', label: '⚡ Электрика' },
    { key: 'other', label: '🔨 Другое' },
];

// ──────────────────────────────────────────────────────────────
// Wizard scene: create_order
// Steps: category → description → price_type → (price) → confirm
// ──────────────────────────────────────────────────────────────
const createOrderWizard = new Scenes.WizardScene(
    'create_order',

    // Step 0 — choose category
    async (ctx) => {
        await ctx.reply(
            '📂 Выберите категорию услуги:',
            Markup.inlineKeyboard(
                CATEGORIES.map(c => [Markup.button.callback(c.label, `cat:${c.key}`)])
            )
        );
        return ctx.wizard.next();
    },

    // Step 1 — wait for category callback
    async (ctx) => {
        if (!ctx.callbackQuery) {
            return ctx.reply('Пожалуйста, выберите категорию кнопкой выше.');
        }
        await ctx.answerCbQuery();
        const cat = ctx.callbackQuery.data.split(':')[1];
        if (!CATEGORIES.find(c => c.key === cat)) {
            return ctx.reply('Неверная категория.');
        }
        ctx.scene.state.category = cat;
        await ctx.editMessageText(
            `✅ Категория: ${CATEGORIES.find(c => c.key === cat).label}`
        );
        await ctx.reply('📝 Опишите задачу (что нужно сделать?):');
        return ctx.wizard.next();
    },

    // Step 2 — description
    async (ctx) => {
        if (!ctx.message?.text) return ctx.reply('Введите описание текстом.');
        ctx.scene.state.description = ctx.message.text.trim();
        await ctx.reply(
            '💰 Укажите тип цены:',
            Markup.inlineKeyboard([
                [Markup.button.callback('Фиксированная', 'price_type:fixed')],
                [Markup.button.callback('Договорная', 'price_type:negotiable')],
            ])
        );
        return ctx.wizard.next();
    },

    // Step 3 — price type
    async (ctx) => {
        if (!ctx.callbackQuery) return ctx.reply('Выберите тип цены кнопкой выше.');
        await ctx.answerCbQuery();
        const priceType = ctx.callbackQuery.data.split(':')[1];
        ctx.scene.state.price_type = priceType;

        if (priceType === 'fixed') {
            await ctx.editMessageText('✅ Тип цены: Фиксированная');
            await ctx.reply('Введите сумму (только цифры, в сомах):');
            return ctx.wizard.next();
        }

        // negotiable — skip price input
        ctx.scene.state.price = null;
        await ctx.editMessageText('✅ Тип цены: Договорная');
        return saveOrder(ctx);
    },

    // Step 4 — price amount (only for fixed)
    async (ctx) => {
        const amount = parseFloat(ctx.message?.text);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply('Введите корректную сумму (число больше 0):');
        }
        ctx.scene.state.price = amount;
        return saveOrder(ctx);
    }
);

async function saveOrder(ctx) {
    const { category, description, price_type, price } = ctx.scene.state;

    const order = await require('../db/queries/orders').createOrder({
        client_id: ctx.from.id,
        category,
        description,
        price_type,
        price,
    });

    const priceText = price_type === 'fixed' ? `${price} ₽` : 'Договорная';
    await ctx.reply(
        `✅ <b>Заказ #${order.id} создан!</b>\n\n` +
        `📂 ${orderService.CATEGORY_LABELS[category]}\n` +
        `📝 ${description}\n` +
        `💰 ${priceText}\n\n` +
        `⏳ Рассылаю мастерам...`,
        { parse_mode: 'HTML' }
    );

    // Pass a minimal bot-like object — ctx.telegram IS bot.telegram in Telegraf
    orderService.dispatchOrderToMasters({ telegram: ctx.telegram }, order)
        .catch(err => console.error('[createOrderWizard] dispatchError:', err.message));

    await ctx.scene.leave();
}

// Handle wizard leave
createOrderWizard.leave(async (ctx) => {
    await ctx.reply('Главное меню:', Markup.keyboard([
        ['📝 Создать заказ'],
        ['📋 Мои заказы'],
    ]).resize());
});

module.exports = { createOrderWizard };
