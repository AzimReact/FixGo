'use strict';
const subscriptionsDb = require('../db/queries/subscriptions');

/**
 * Activate a MOCK subscription for a master (no payment)
 */
async function activateMockSubscription(masterId) {
    const existing = await subscriptionsDb.hasActiveSubscription(masterId);
    if (existing) {
        return { alreadyActive: true };
    }
    const sub = await subscriptionsDb.createMockSubscription(masterId);
    return { alreadyActive: false, subscription: sub };
}

/**
 * Called after successful Telegram Stars / Invoice payment
 * @param {string} chargeId - pre_checkout_query or successful_payment charge_id
 */
async function activatePaidSubscription(masterId, chargeId, method = 'telegram_stars') {
    const sub = await subscriptionsDb.createPaidSubscription(masterId, chargeId, method);
    return sub;
}

/**
 * Check and return subscription status for a master
 */
async function getSubscriptionStatus(masterId) {
    const isActive = await subscriptionsDb.hasActiveSubscription(masterId);
    const sub = await subscriptionsDb.getSubscription(masterId);
    return { isActive, subscription: sub };
}

module.exports = {
    activateMockSubscription,
    activatePaidSubscription,
    getSubscriptionStatus,
};
