'use strict';
const { Scenes, Markup } = require('telegraf');
const usersDb = require('../db/queries/users');
const { mainMenu } = require('./startHandler');

const registerMasterWizard = new Scenes.WizardScene(
    'register_master',
    
    // Step 0 - Ask for Name
    async (ctx) => {
        await ctx.reply('Пожалуйста, введите ваше имя и фамилию (в одном сообщении):');
        return ctx.wizard.next();
    },

    // Step 1 - Process Name, ask for Phone
    async (ctx) => {
        if (!ctx.message?.text) {
            return ctx.reply('Введите имя и фамилию текстом:');
        }
        
        ctx.scene.state.full_name = ctx.message.text.trim();
        
        await ctx.reply(
            'Отлично! Теперь поделитесь вашим номером телефона:',
            Markup.keyboard([
                [Markup.button.contactRequest('📱 Поделиться контактом')]
            ]).resize().oneTime()
        );
        return ctx.wizard.next();
    },
    
    // Step 2 - Process Phone, save to DB
    async (ctx) => {
        let phone = '';
        if (ctx.message?.contact) {
            phone = ctx.message.contact.phone_number;
        } else if (ctx.message?.text) {
            phone = ctx.message.text.trim();
        }

        if (!phone) {
            return ctx.reply('Пожалуйста, отправьте контакт или напишите номер телефона текстом.');
        }

        const from = ctx.from;
        
        // Save base user data
        await usersDb.upsertUser({
            id: from.id,
            username: from.username || null,
            full_name: ctx.scene.state.full_name,
            role: 'master',
        });
        
        // Update user's phone number
        await usersDb.updateUserPhone(from.id, phone);
        
        await ctx.reply(
            `✅ Вы успешно зарегистрированы как <b>🔧 Мастер</b>!\nВаше имя: ${ctx.scene.state.full_name}\nВаш телефон: ${phone}`,
            { parse_mode: 'HTML' }
        );
        
        await ctx.reply('Главное меню:', mainMenu('master'));
        
        return ctx.scene.leave();
    }
);

module.exports = { registerMasterWizard };
