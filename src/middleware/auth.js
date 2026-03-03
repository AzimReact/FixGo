'use strict';
const usersDb = require('../db/queries/users');

/**
 * Middleware: attach `ctx.dbUser` before every handler.
 * Automatically upserts user from Telegram context.
 */
async function attachUser(ctx, next) {
    if (!ctx.from) return next();

    const from = ctx.from;
    const full_name = [from.first_name, from.last_name].filter(Boolean).join(' ');

    // Read from DB (fast path — user already registered)
    ctx.dbUser = await usersDb.findById(from.id);

    // If user exists, silently update username in background
    if (ctx.dbUser && ctx.dbUser.username !== from.username) {
        usersDb.upsertUser({
            id: from.id,
            username: from.username || null,
            full_name,
            role: ctx.dbUser.role,
        }).catch(() => { });
    }

    return next();
}

/**
 * Middleware: ensure user is registered (has role).
 * Stops the chain and prompts /start if not.
 */
async function requireUser(ctx, next) {
    if (!ctx.dbUser) {
        await ctx.reply('Пожалуйста, начните с команды /start для регистрации.');
        return;
    }
    return next();
}

/**
 * Middleware: ensure user is a client
 */
async function requireClient(ctx, next) {
    if (ctx.dbUser?.role !== 'client') {
        await ctx.reply('Это действие доступно только клиентам.');
        return;
    }
    return next();
}

/**
 * Middleware: ensure user is a master
 */
async function requireMaster(ctx, next) {
    if (ctx.dbUser?.role !== 'master') {
        await ctx.reply('Это действие доступно только мастерам.');
        return;
    }
    return next();
}

module.exports = { attachUser, requireUser, requireClient, requireMaster };
