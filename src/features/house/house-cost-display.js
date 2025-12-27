/**
 * House Upgrade Cost Display
 * UI rendering for house upgrade costs
 */

import houseCostCalculator from './house-cost-calculator.js';
import config from '../../core/config.js';
import { numberFormatter } from '../../utils/formatters.js';
import { createCollapsibleSection } from '../../utils/ui-components.js';

class HouseCostDisplay {
    constructor() {
        this.isActive = false;
        this.displayedRooms = new WeakSet(); // Track which room cards have been enhanced
    }

    /**
     * Initialize the display system
     */
    initialize() {
        if (!config.getSetting('houseUpgradeCosts')) {
            return;
        }

        this.isActive = true;
    }

    /**
     * Add upgrade cost display to a house room card
     * @param {Element} roomCard - The house room card DOM element
     * @param {string} houseRoomHrid - House room HRID
     */
    async addCostDisplay(roomCard, houseRoomHrid) {
        // Don't add twice to same card
        if (this.displayedRooms.has(roomCard)) {
            return;
        }

        this.displayedRooms.add(roomCard);

        const currentLevel = houseCostCalculator.getCurrentRoomLevel(houseRoomHrid);

        // Don't show if already max level
        if (currentLevel >= 8) {
            return;
        }

        try {
            // Create collapsible section
            const content = await this.createCostContent(houseRoomHrid, currentLevel);
            const section = createCollapsibleSection(
                '💰',
                'Upgrade Costs',
                content,
                false // collapsed by default
            );

            // Find insertion point (after the room's existing content)
            const insertPoint = roomCard.querySelector('[class*="HouseRoom_"]') || roomCard;
            insertPoint.appendChild(section);

        } catch (error) {
            console.error('[House Cost Display] Failed to display costs:', error);
        }
    }

    /**
     * Create the cost content HTML
     * @param {string} houseRoomHrid - House room HRID
     * @param {number} currentLevel - Current room level
     * @returns {Promise<HTMLElement>} Content element
     */
    async createCostContent(houseRoomHrid, currentLevel) {
        const container = document.createElement('div');
        container.style.cssText = `
            padding: 8px;
            font-size: 0.875rem;
        `;

        // Current upgrade section
        const currentSection = await this.createCurrentUpgradeSection(houseRoomHrid, currentLevel);
        container.appendChild(currentSection);

        // Cumulative cost section (if not upgrading to max)
        if (currentLevel < 7) { // Can select levels beyond current+1
            const separator = document.createElement('div');
            separator.style.cssText = `
                border-top: 1px solid ${config.SCRIPT_COLOR_SECONDARY};
                margin: 12px 0;
                opacity: 0.3;
            `;
            container.appendChild(separator);

            const cumulativeSection = await this.createCumulativeCostSection(houseRoomHrid, currentLevel);
            container.appendChild(cumulativeSection);
        }

        return container;
    }

    /**
     * Create current upgrade section (next level only)
     * @param {string} houseRoomHrid - House room HRID
     * @param {number} currentLevel - Current room level
     * @returns {Promise<HTMLElement>} Section element
     */
    async createCurrentUpgradeSection(houseRoomHrid, currentLevel) {
        const section = document.createElement('div');

        const nextLevel = currentLevel + 1;
        const costData = await houseCostCalculator.calculateLevelCost(houseRoomHrid, nextLevel);

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            color: ${config.SCRIPT_COLOR_MAIN};
            font-weight: bold;
            margin-bottom: 8px;
        `;
        header.textContent = `Next Upgrade (Level ${currentLevel} → ${nextLevel})`;
        section.appendChild(header);

        // Materials list
        const materialsList = this.createMaterialsList(costData, true);
        section.appendChild(materialsList);

        // Total value
        const totalDiv = document.createElement('div');
        totalDiv.style.cssText = `
            margin-top: 8px;
            font-weight: bold;
            color: ${config.SCRIPT_COLOR_MAIN};
        `;
        totalDiv.textContent = `Total Market Value: ${numberFormatter(costData.totalValue)}`;
        section.appendChild(totalDiv);

        return section;
    }

    /**
     * Create cumulative cost section with dropdown selector
     * @param {string} houseRoomHrid - House room HRID
     * @param {number} currentLevel - Current room level
     * @returns {Promise<HTMLElement>} Section element
     */
    async createCumulativeCostSection(houseRoomHrid, currentLevel) {
        const section = document.createElement('div');

        // Header with dropdown
        const headerContainer = document.createElement('div');
        headerContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        `;

        const headerLabel = document.createElement('span');
        headerLabel.style.cssText = `
            color: ${config.SCRIPT_COLOR_MAIN};
            font-weight: bold;
        `;
        headerLabel.textContent = 'Cost to Level:';

        const dropdown = document.createElement('select');
        dropdown.style.cssText = `
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid ${config.SCRIPT_COLOR_SECONDARY};
            color: ${config.SCRIPT_COLOR_MAIN};
            border-radius: 4px;
            cursor: pointer;
        `;

        // Add options for levels current+2 to 8
        for (let level = currentLevel + 2; level <= 8; level++) {
            const option = document.createElement('option');
            option.value = level;
            option.textContent = level;
            dropdown.appendChild(option);
        }

        // Default to level 5 or max available
        const defaultLevel = Math.min(5, 8);
        if (defaultLevel > currentLevel + 1) {
            dropdown.value = defaultLevel;
        }

        headerContainer.appendChild(headerLabel);
        headerContainer.appendChild(dropdown);
        section.appendChild(headerContainer);

        // Cost display container
        const costContainer = document.createElement('div');
        costContainer.className = 'mwi-cumulative-cost-container';
        section.appendChild(costContainer);

        // Initial render
        await this.updateCumulativeCostDisplay(costContainer, houseRoomHrid, currentLevel, parseInt(dropdown.value));

        // Update on dropdown change
        dropdown.addEventListener('change', async () => {
            await this.updateCumulativeCostDisplay(costContainer, houseRoomHrid, currentLevel, parseInt(dropdown.value));
        });

        return section;
    }

    /**
     * Update cumulative cost display based on selected target level
     * @param {Element} container - Container element
     * @param {string} houseRoomHrid - House room HRID
     * @param {number} currentLevel - Current room level
     * @param {number} targetLevel - Target room level
     */
    async updateCumulativeCostDisplay(container, houseRoomHrid, currentLevel, targetLevel) {
        container.innerHTML = ''; // Clear previous content

        const costData = await houseCostCalculator.calculateCumulativeCost(houseRoomHrid, currentLevel, targetLevel);

        // Subheader
        const subheader = document.createElement('div');
        subheader.style.cssText = `
            color: ${config.SCRIPT_COLOR_SECONDARY};
            margin-bottom: 8px;
            font-size: 0.8125rem;
        `;
        subheader.textContent = `Cumulative Cost (Level ${currentLevel} → ${targetLevel})`;
        container.appendChild(subheader);

        // Materials list
        const materialsList = this.createMaterialsList(costData, true);
        container.appendChild(materialsList);

        // Total value
        const totalDiv = document.createElement('div');
        totalDiv.style.cssText = `
            margin-top: 8px;
            font-weight: bold;
            color: ${config.SCRIPT_COLOR_MAIN};
        `;
        totalDiv.textContent = `Total Market Value: ${numberFormatter(costData.totalValue)}`;
        container.appendChild(totalDiv);
    }

    /**
     * Create materials list HTML
     * @param {Object} costData - Cost data object
     * @param {boolean} showInventory - Whether to show inventory comparison
     * @returns {HTMLElement} Materials list element
     */
    createMaterialsList(costData, showInventory) {
        const list = document.createElement('div');
        list.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        // Add coins first
        if (costData.coins > 0) {
            const coinItem = this.createMaterialItem({
                itemHrid: '/items/coin',
                count: costData.coins,
                marketPrice: 1,
                totalValue: costData.coins
            }, showInventory);
            list.appendChild(coinItem);
        }

        // Add all materials (flat list)
        for (const material of costData.materials) {
            const materialItem = this.createMaterialItem(material, showInventory);
            list.appendChild(materialItem);
        }

        return list;
    }

    /**
     * Create a single material item row
     * @param {Object} material - Material data
     * @param {boolean} showInventory - Whether to show inventory comparison
     * @returns {HTMLElement} Material row element
     */
    createMaterialItem(material, showInventory) {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
        `;

        const itemName = houseCostCalculator.getItemName(material.itemHrid);
        const inventoryCount = showInventory ? houseCostCalculator.getInventoryCount(material.itemHrid) : 0;
        const hasEnough = inventoryCount >= material.count;

        // Item name and count
        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `
            flex: 1;
            color: ${config.SCRIPT_COLOR_MAIN};
        `;
        nameSpan.textContent = `${numberFormatter(material.count)} ${itemName}`;
        row.appendChild(nameSpan);

        // Market value
        if (material.itemHrid !== '/items/coin') {
            const valueSpan = document.createElement('span');
            valueSpan.style.cssText = `
                color: ${config.SCRIPT_COLOR_SECONDARY};
                font-size: 0.8125rem;
            `;
            valueSpan.textContent = `(${numberFormatter(material.totalValue)})`;
            row.appendChild(valueSpan);
        }

        // Inventory comparison
        if (showInventory && material.itemHrid !== '/items/coin') {
            const inventorySpan = document.createElement('span');
            inventorySpan.style.cssText = `
                color: ${hasEnough ? '#4ade80' : '#f87171'};
                font-size: 0.8125rem;
            `;
            inventorySpan.textContent = hasEnough ? `✓ ${numberFormatter(inventoryCount)}` : `✗ ${numberFormatter(inventoryCount)}`;
            row.appendChild(inventorySpan);
        }

        return row;
    }

    /**
     * Disable the feature
     */
    disable() {
        // Remove all injected cost displays
        document.querySelectorAll('.mwi-house-upgrade-costs').forEach(el => el.remove());
        this.displayedRooms = new WeakSet();
        this.isActive = false;
    }
}

// Create and export singleton instance
const houseCostDisplay = new HouseCostDisplay();

export default houseCostDisplay;
