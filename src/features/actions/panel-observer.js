/**
 * Action Panel Observer
 *
 * Detects when action panels appear and enhances them with:
 * - Gathering profit calculations (Foraging, Woodcutting, Milking)
 * - Other action panel enhancements (future)
 *
 * Automatically filters out combat action panels.
 */

import dataManager from '../../core/data-manager.js';
import { calculateGatheringProfit, formatProfitDisplay } from './gathering-profit.js';

/**
 * Action types for gathering skills (3 skills)
 */
const GATHERING_TYPES = [
    '/action_types/foraging',
    '/action_types/woodcutting',
    '/action_types/milking'
];

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
        subtree: true  // Watch entire tree, not just direct children
    });

    console.log('[MWI Tools] Action panel observer initialized');
}

/**
 * DEBUG: Log panel structure to help diagnose selector issues
 * @param {HTMLElement} panel - Action panel element
 */
function logPanelStructure(panel) {
    console.log('[DEBUG] ===== PANEL STRUCTURE =====');

    // Log all direct children of panel
    console.log('[DEBUG] Panel has', panel.children.length, 'direct children');

    // Log all divs with their classes
    const allDivs = panel.querySelectorAll('div');
    console.log('[DEBUG] Found', allDivs.length, 'divs in panel');

    // Log unique class names found
    const classNames = new Set();
    allDivs.forEach(div => {
        if (div.className && typeof div.className === 'string') {
            div.className.split(' ').forEach(cls => {
                if (cls.trim()) classNames.add(cls.trim());
            });
        }
    });

    console.log('[DEBUG] Unique classes found:', Array.from(classNames).sort());

    // Check our specific selectors
    console.log('[DEBUG] Selector check:');
    console.log('  - EXP_GAIN:', !!panel.querySelector(SELECTORS.EXP_GAIN));
    console.log('  - ACTION_NAME:', !!panel.querySelector(SELECTORS.ACTION_NAME));
    console.log('  - DROP_TABLE:', !!panel.querySelector(SELECTORS.DROP_TABLE));

    console.log('[DEBUG] =============================');
}

/**
 * Handle action panel appearance
 * @param {HTMLElement} panel - Action panel element
 */
async function handleActionPanel(panel) {
    if (!panel) {
        console.log('[Action Panel] Panel is null');
        return;
    }

    console.log('[Action Panel] Panel detected');

    // DEBUG: Log panel structure to identify selector issues
    logPanelStructure(panel);

    // Filter out combat action panels (they don't have XP gain display)
    const expGainElement = panel.querySelector(SELECTORS.EXP_GAIN);
    if (!expGainElement) {
        // This is a combat action panel, skip it
        console.log('[Action Panel] No XP gain element - skipping combat panel');
        return;
    }

    console.log('[Action Panel] XP gain element found - this is a skilling panel');

    // Check if this is a gathering action (Foraging/Woodcutting/Milking) with drop table
    const dropTableElement = panel.querySelector(SELECTORS.DROP_TABLE);
    console.log('[Action Panel] Drop table element:', dropTableElement);

    if (!dropTableElement) {
        // No drop table - skip (nothing to calculate profit for)
        console.log('[Action Panel] No drop table - skipping');
        return;
    }

    // Get action name
    const actionNameElement = panel.querySelector(SELECTORS.ACTION_NAME);
    if (!actionNameElement) {
        console.log('[Action Panel] No action name element');
        return;
    }

    const actionName = getOriginalText(actionNameElement);
    console.log('[Action Panel] Action name:', actionName);

    // Convert action name to HRID
    const actionHrid = getActionHridFromName(actionName);
    console.log('[Action Panel] Action HRID:', actionHrid);

    if (!actionHrid) {
        console.log('[Action Panel] Could not find action HRID');
        return;
    }

    // Check if action is a gathering skill (Foraging, Woodcutting, Milking)
    const gameData = dataManager.getInitClientData();
    const actionDetail = gameData.actionDetailMap[actionHrid];
    console.log('[Action Panel] Action type:', actionDetail?.type);

    if (!actionDetail || !GATHERING_TYPES.includes(actionDetail.type)) {
        console.log('[Action Panel] Not a gathering action - skipping');
        return;
    }

    console.log('[Action Panel] All checks passed - calculating profit');

    // Calculate and display profit
    await displayGatheringProfit(panel, actionHrid);
}

/**
 * Display gathering profit calculation in panel
 * @param {HTMLElement} panel - Action panel element
 * @param {string} actionHrid - Action HRID
 */
async function displayGatheringProfit(panel, actionHrid) {
    console.log('[Display Profit] Starting profit calculation for:', actionHrid);

    // Calculate profit
    const profitData = await calculateGatheringProfit(actionHrid);
    console.log('[Display Profit] Profit data:', profitData);

    if (!profitData) {
        console.log('[Display Profit] No profit data returned');
        return;
    }

    // Format and inject HTML
    const profitHTML = formatProfitDisplay(profitData);
    console.log('[Display Profit] Generated HTML length:', profitHTML?.length);

    if (!profitHTML) {
        console.log('[Display Profit] No HTML generated');
        return;
    }

    // Find insertion point (after drop table)
    const dropTableElement = panel.querySelector(SELECTORS.DROP_TABLE);
    if (!dropTableElement) {
        console.log('[Display Profit] Could not find drop table for insertion');
        return;
    }

    // Check if we already added profit display
    const existingProfit = panel.querySelector('#mwi-foraging-profit');
    if (existingProfit) {
        console.log('[Display Profit] Removing existing profit display');
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

    console.log('[Display Profit] ✅ Profit display inserted successfully');
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
