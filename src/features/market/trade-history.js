/**
 * Personal Trade History Module
 * Tracks your buy/sell prices for marketplace items
 */

import webSocketHook from '../../core/websocket.js';
import storage from '../../core/storage.js';
import config from '../../core/config.js';

/**
 * TradeHistory class manages personal buy/sell price tracking
 */
class TradeHistory {
    constructor() {
        this.history = {}; // itemHrid:enhancementLevel -> { buy, sell }
        this.isInitialized = false;
        this.isLoaded = false;
    }

    /**
     * Setup setting listener for feature toggle
     */
    setupSettingListener() {
        config.onSettingChange('market_tradeHistory', (value) => {
            if (value) {
                this.initialize();
            } else {
                this.disable();
            }
        });
    }

    /**
     * Initialize trade history tracking
     */
    async initialize() {
        if (!config.getSetting('market_tradeHistory')) {
            return;
        }

        if (this.isInitialized) {
            return;
        }

        // Load existing history from storage
        await this.loadHistory();

        // Hook into WebSocket for market listing updates
        webSocketHook.on('market_listings_updated', (data) => {
            this.handleMarketUpdate(data);
        });

        this.isInitialized = true;
    }

    /**
     * Load trade history from storage
     */
    async loadHistory() {
        try {
            const saved = await storage.getJSON('tradeHistory', 'settings', {});
            this.history = saved || {};
            this.isLoaded = true;
        } catch (error) {
            console.error('[TradeHistory] Failed to load history:', error);
            this.history = {};
            this.isLoaded = true;
        }
    }

    /**
     * Save trade history to storage
     */
    async saveHistory() {
        try {
            await storage.setJSON('tradeHistory', this.history, 'settings', true);
        } catch (error) {
            console.error('[TradeHistory] Failed to save history:', error);
        }
    }

    /**
     * Handle market_listings_updated WebSocket message
     * @param {Object} data - Market update data
     */
    handleMarketUpdate(data) {
        if (!data.endMarketListings) return;

        let hasChanges = false;

        // Process each completed order
        data.endMarketListings.forEach(order => {
            // Only track orders that actually filled
            if (order.filledQuantity === 0) return;

            const key = `${order.itemHrid}:${order.enhancementLevel}`;

            // Get existing history for this item or create new
            const itemHistory = this.history[key] || {};

            // Update buy or sell price
            if (order.isSell) {
                itemHistory.sell = order.price;
            } else {
                itemHistory.buy = order.price;
            }

            this.history[key] = itemHistory;
            hasChanges = true;
        });

        // Save to storage if any changes
        if (hasChanges) {
            this.saveHistory();
        }
    }

    /**
     * Get trade history for a specific item
     * @param {string} itemHrid - Item HRID
     * @param {number} enhancementLevel - Enhancement level (default 0)
     * @returns {Object|null} { buy, sell } or null if no history
     */
    getHistory(itemHrid, enhancementLevel = 0) {
        const key = `${itemHrid}:${enhancementLevel}`;
        return this.history[key] || null;
    }

    /**
     * Check if history data is loaded
     * @returns {boolean}
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * Clear all trade history
     */
    async clearHistory() {
        this.history = {};
        await this.saveHistory();
    }

    /**
     * Disable the feature
     */
    disable() {
        // Don't clear history data, just stop tracking
        this.isInitialized = false;
    }
}

// Create and export singleton instance
const tradeHistory = new TradeHistory();
tradeHistory.setupSettingListener();

export default tradeHistory;
