'use strict';

/**
 * Global error handler middleware.
 * Catches any error thrown in downstream handlers.
 */
async function errorHandler(err, ctx) {
    console.error('[bot] Unhandled error:', {
        message: err.message,
        stack: err.stack,
        update: JSON.stringify(ctx.update).slice(0, 200),
    });

    try {
        await ctx.reply('⚠️ Произошла внутренняя ошибка. Попробуйте позже.');
    } catch (_) {
        // ignore if unable to reply
    }
}

module.exports = { errorHandler };
