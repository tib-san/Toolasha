/**
 * Trade History Display Module
 * Shows your last buy/sell prices in the marketplace panel
 */

import config from '../../core/config.js';
import domObserver from '../../core/dom-observer.js';
import dataManager from '../../core/data-manager.js';
import tradeHistory from './trade-history.js';
import { formatKMB } from '../../utils/formatters.js';

class TradeHistoryDisplay {
    constructor() {
        this.isActive = false;
        this.unregisterObserver = null;
        this.currentItemHrid = null;
        this.currentEnhancementLevel = 0;
    }

    /**
     * Initialize the display system
     */
    initialize() {
        if (!config.getSetting('market_tradeHistory')) {
            return;
        }

        this.setupObserver();
        this.isActive = true;
    }

    /**
     * Setup DOM observer to watch for marketplace current item panel
     */
    setupObserver() {
        // Watch for the current item panel (when viewing a specific item in marketplace)
        this.unregisterObserver = domObserver.onClass(
            'TradeHistoryDisplay',
            'MarketplacePanel_currentItem',
            (currentItemPanel) => {
                this.handleItemPanelUpdate(currentItemPanel);
            }
        );

        // Check for existing panel
        const existingPanel = document.querySelector('[class*="MarketplacePanel_currentItem"]');
        if (existingPanel) {
            this.handleItemPanelUpdate(existingPanel);
        }
    }

    /**
     * Handle current item panel update
     * @param {HTMLElement} currentItemPanel - The current item panel container
     */
    handleItemPanelUpdate(currentItemPanel) {
        // Extract item information
        const itemInfo = this.extractItemInfo(currentItemPanel);
        if (!itemInfo) {
            return;
        }

        const { itemHrid, enhancementLevel } = itemInfo;

        // Check if this is a different item
        if (itemHrid === this.currentItemHrid && enhancementLevel === this.currentEnhancementLevel) {
            return; // Same item, no need to update
        }

        // Update tracking
        this.currentItemHrid = itemHrid;
        this.currentEnhancementLevel = enhancementLevel;

        // Get trade history for this item
        const history = tradeHistory.getHistory(itemHrid, enhancementLevel);

        // Update or create display
        this.updateDisplay(currentItemPanel, history);
    }

    /**
     * Extract item HRID and enhancement level from current item panel
     * @param {HTMLElement} panel - Current item panel
     * @returns {Object|null} { itemHrid, enhancementLevel } or null
     */
    extractItemInfo(panel) {
        // Get enhancement level from badge
        const levelBadge = panel.querySelector('[class*="Item_enhancementLevel"]');
        const enhancementLevel = levelBadge
            ? parseInt(levelBadge.textContent.replace('+', '')) || 0
            : 0;

        // Get item HRID from icon aria-label
        const icon = panel.querySelector('[class*="Icon_icon"]');
        if (!icon || !icon.ariaLabel) {
            return null;
        }

        const itemName = icon.ariaLabel.trim();

        // Convert item name to HRID
        const itemHrid = this.nameToHrid(itemName);
        if (!itemHrid) {
            return null;
        }

        return { itemHrid, enhancementLevel };
    }

    /**
     * Convert item display name to HRID
     * @param {string} itemName - Item display name
     * @returns {string|null} Item HRID or null
     */
    nameToHrid(itemName) {
        // Try to find item in game data
        const gameData = dataManager.getInitClientData();
        if (!gameData) return null;

        for (const [hrid, item] of Object.entries(gameData.itemDetailMap)) {
            if (item.name === itemName) {
                return hrid;
            }
        }

        return null;
    }

    /**
     * Update trade history display
     * @param {HTMLElement} panel - Current item panel
     * @param {Object|null} history - Trade history { buy, sell } or null
     */
    updateDisplay(panel, history) {
        // Remove existing display
        const existing = panel.querySelector('.mwi-trade-history');
        if (existing) {
            existing.remove();
        }

        // Don't show anything if no history
        if (!history || (!history.buy && !history.sell)) {
            return;
        }

        // Ensure panel has position relative for absolute positioning to work
        if (!panel.style.position || panel.style.position === 'static') {
            panel.style.position = 'relative';
        }

        // Create history display
        const historyDiv = document.createElement('div');
        historyDiv.className = 'mwi-trade-history';
        historyDiv.style.cssText = `
            position: absolute;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.85rem;
            color: #888;
            padding: 6px 12px;
            background: rgba(0,0,0,0.8);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            white-space: nowrap;
            z-index: 10;
        `;

        // Build content
        const parts = [];
        parts.push(`<span style="color: #aaa; font-weight: 500;">Last:</span>`);

        if (history.buy) {
            parts.push(`<span style="color: ${config.COLOR_LOSS}; font-weight: 600;" title="Your last buy price">Buy ${formatKMB(history.buy)}</span>`);
        }

        if (history.buy && history.sell) {
            parts.push(`<span style="color: #555;">|</span>`);
        }

        if (history.sell) {
            parts.push(`<span style="color: ${config.COLOR_PROFIT}; font-weight: 600;" title="Your last sell price">Sell ${formatKMB(history.sell)}</span>`);
        }

        historyDiv.innerHTML = parts.join('');

        // Append to panel (position is controlled by absolute positioning)
        panel.appendChild(historyDiv);
    }

    /**
     * Disable the display
     */
    disable() {
        if (this.unregisterObserver) {
            this.unregisterObserver();
            this.unregisterObserver = null;
        }

        // Remove all displays
        document.querySelectorAll('.mwi-trade-history').forEach(el => el.remove());

        this.isActive = false;
        this.currentItemHrid = null;
        this.currentEnhancementLevel = 0;
    }
}

// Create and export singleton instance
const tradeHistoryDisplay = new TradeHistoryDisplay();

export default tradeHistoryDisplay;
