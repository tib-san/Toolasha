/**
 * Action Panel Observer
 *
 * Detects when action panels appear and enhances them with:
 * - Foraging profit calculations
 * - Other action panel enhancements (future)
 *
 * Automatically filters out combat action panels.
 */

import dataManager from '../../core/data-manager.js';
import { calculateForagingProfit, formatProfitDisplay } from './foraging-profit.js';

/**
 * CSS selectors for action panel detection
 */
const SELECTORS = {
    MODAL_CONTAINER: '.Modal_modalContainer__3B80m',
    PANEL: 'div.SkillActionDetail_regularComponent__3oCgr',
    EXP_GAIN: 'div.SkillActionDetail_expGain__F5xHu',
    ACTION_NAME: 'div.SkillActionDetail_name__3erHV',
    DROP_TABLE: 'div.SkillActionDetail_dropTable__3ViVp'
};

/**
 * Initialize action panel observer
 * Sets up MutationObserver on document.body to watch for action panels
 */
export function initActionPanelObserver() {
    setupMutationObserver();
}

/**
 * Set up MutationObserver to detect action panels
 */
function setupMutationObserver() {
    const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            for (const addedNode of mutation.addedNodes) {
                // Check if this is a modal container with an action panel
                if (
                    addedNode.nodeType === Node.ELEMENT_NODE &&
                    addedNode.classList?.contains('Modal_modalContainer__3B80m') &&
                    addedNode.querySelector(SELECTORS.PANEL)
                ) {
                    const panel = addedNode.querySelector(SELECTORS.PANEL);
                    await handleActionPanel(panel);
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: false
    });

    console.log('[MWI Tools] Action panel observer initialized');
}

/**
 * Handle action panel appearance
 * @param {HTMLElement} panel - Action panel element
 */
async function handleActionPanel(panel) {
    if (!panel) {
        return;
    }

    // Filter out combat action panels (they don't have XP gain display)
    const expGainElement = panel.querySelector(SELECTORS.EXP_GAIN);
    if (!expGainElement) {
        // This is a combat action panel, skip it
        return;
    }

    // Check if this is a Foraging action with drop table
    const dropTableElement = panel.querySelector(SELECTORS.DROP_TABLE);
    if (!dropTableElement || dropTableElement.children.length <= 1) {
        // Not a Foraging action with multiple drops, skip
        return;
    }

    // Get action name
    const actionNameElement = panel.querySelector(SELECTORS.ACTION_NAME);
    if (!actionNameElement) {
        return;
    }

    const actionName = getOriginalText(actionNameElement);

    // Convert action name to HRID
    const actionHrid = getActionHridFromName(actionName);
    if (!actionHrid) {
        return;
    }

    // Check if action is Foraging
    const gameData = dataManager.getInitClientData();
    const actionDetail = gameData.actionDetailMap[actionHrid];
    if (!actionDetail || !actionDetail.type.includes('foraging')) {
        return;
    }

    // Calculate and display profit
    await displayForagingProfit(panel, actionHrid);
}

/**
 * Display Foraging profit calculation in panel
 * @param {HTMLElement} panel - Action panel element
 * @param {string} actionHrid - Action HRID
 */
async function displayForagingProfit(panel, actionHrid) {
    // Calculate profit
    const profitData = await calculateForagingProfit(actionHrid);
    if (!profitData) {
        return;
    }

    // Format and inject HTML
    const profitHTML = formatProfitDisplay(profitData);
    if (!profitHTML) {
        return;
    }

    // Find insertion point (after drop table)
    const dropTableElement = panel.querySelector(SELECTORS.DROP_TABLE);
    if (!dropTableElement) {
        return;
    }

    // Check if we already added profit display
    const existingProfit = panel.querySelector('#mwi-foraging-profit');
    if (existingProfit) {
        existingProfit.remove();
    }

    // Create profit display container
    const profitContainer = document.createElement('div');
    profitContainer.id = 'mwi-foraging-profit';
    profitContainer.innerHTML = profitHTML;

    // Insert after drop table
    dropTableElement.parentNode.insertBefore(
        profitContainer,
        dropTableElement.nextSibling
    );
}

/**
 * Get original text from element (strips injected content)
 * @param {HTMLElement} element - Element to extract text from
 * @returns {string} Original text content
 */
function getOriginalText(element) {
    // Clone element to avoid modifying original
    const clone = element.cloneNode(true);

    // Remove any injected elements
    const injected = clone.querySelectorAll('[id^="mwi-"]');
    injected.forEach(el => el.remove());

    return clone.textContent.trim();
}

/**
 * Convert action name to HRID
 * @param {string} actionName - Display name of action
 * @returns {string|null} Action HRID or null if not found
 */
function getActionHridFromName(actionName) {
    const gameData = dataManager.getInitClientData();
    if (!gameData?.actionDetailMap) {
        return null;
    }

    // Search for action by name
    for (const [hrid, detail] of Object.entries(gameData.actionDetailMap)) {
        if (detail.name === actionName) {
            return hrid;
        }
    }

    return null;
}
