'use strict';
const https = require('https');

/**
 * Prevents Render from sleeping by pinging the app's health endpoint
 * @param {string} url - The base URL of the application
 * @param {number} intervalMinutes - Interval in minutes (default 14)
 */
function startKeepAlive(url, intervalMinutes = 14) {
    if (!url) {
        console.warn('[keep-alive] No URL provided, skipping keep-alive pings.');
        return;
    }

    const healthUrl = `${url}/health`;
    
    // Immediate ping
    ping(healthUrl);

    // Set interval
    setInterval(() => {
        ping(healthUrl);
    }, intervalMinutes * 60 * 1000);
    
    console.log(`[keep-alive] Started keep-alive pings to ${healthUrl} every ${intervalMinutes} minutes.`);
}

function ping(url) {
    https.get(url, (res) => {
        if (res.statusCode === 200) {
            console.log(`[keep-alive] Ping success: ${url}`);
        } else {
            console.warn(`[keep-alive] Ping returned status: ${res.statusCode}`);
        }
    }).on('error', (err) => {
        console.error('[keep-alive] Ping error:', err.message);
    });
}

module.exports = { startKeepAlive };
