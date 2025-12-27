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
        this.currentModalContent = null; // Track current modal to detect room switches
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
     * Augment native costs section with market pricing
     * @param {Element} costsSection - The native HousePanel_costs element
     * @param {string} houseRoomHrid - House room HRID
     * @param {Element} modalContent - The modal content element
     */
    async addCostColumn(costsSection, houseRoomHrid, modalContent) {
        // Remove any existing augmentation first
        this.removeExistingColumn(modalContent);

        const currentLevel = houseCostCalculator.getCurrentRoomLevel(houseRoomHrid);

        // Don't show if already max level
        if (currentLevel >= 8) {
            return;
        }

        try {
            const nextLevel = currentLevel + 1;
            const costData = await houseCostCalculator.calculateLevelCost(houseRoomHrid, nextLevel);

            // Augment each native cost item with market pricing
            await this.augmentNativeCosts(costsSection, costData);

            // Add total cost below native costs
            this.addTotalCost(costsSection, costData);

            // Add compact "To Level" section below
            if (currentLevel < 7) {
                await this.addCompactToLevel(costsSection, houseRoomHrid, currentLevel);
            }

            // Mark this modal as processed
            this.currentModalContent = modalContent;

        } catch (error) {
            console.error('[House Cost Display] Failed to augment costs:', error);
        }
    }

    /**
     * Remove existing augmentations
     * @param {Element} modalContent - The modal content element
     */
    removeExistingColumn(modalContent) {
        // Remove all MWI-added elements
        modalContent.querySelectorAll('.mwi-house-pricing, .mwi-house-pricing-empty, .mwi-house-total, .mwi-house-to-level').forEach(el => el.remove());

        // Restore original grid columns
        const itemRequirementsGrid = modalContent.querySelector('[class*="HousePanel_itemRequirements"]');
        if (itemRequirementsGrid) {
            itemRequirementsGrid.style.gridTemplateColumns = '';
        }
    }

    /**
     * Augment native cost items with market pricing
     * @param {Element} costsSection - Native costs section
     * @param {Object} costData - Cost data from calculator
     */
    async augmentNativeCosts(costsSection, costData) {
        // Find the item requirements grid container
        const itemRequirementsGrid = costsSection.querySelector('[class*="HousePanel_itemRequirements"]');
        if (!itemRequirementsGrid) {
            console.warn('[House Cost Display] Could not find item requirements grid');
            return;
        }

        // Modify the grid to accept 4 columns instead of 3
        // Native grid is: icon | inventory count | input count
        // We want: icon | inventory count | input count | pricing
        const currentGridStyle = window.getComputedStyle(itemRequirementsGrid).gridTemplateColumns;
        console.log('[House Cost Display] Current grid columns:', currentGridStyle);

        // Add a 4th column for pricing (auto width)
        itemRequirementsGrid.style.gridTemplateColumns = currentGridStyle + ' auto';

        // Find all item containers (these have the icons)
        const itemContainers = itemRequirementsGrid.querySelectorAll('[class*="Item_itemContainer"]');
        if (itemContainers.length === 0) {
            console.warn('[House Cost Display] No item containers found');
            return;
        }

        for (const itemContainer of itemContainers) {
            // Game uses SVG sprites, not img tags
            const svg = itemContainer.querySelector('svg');
            if (!svg) continue;

            // Extract item name from href (e.g., #lumber -> lumber)
            const useElement = svg.querySelector('use');
            const hrefValue = useElement?.getAttribute('href') || '';
            const itemName = hrefValue.split('#')[1];
            if (!itemName) continue;

            // Convert to item HRID
            const itemHrid = `/items/${itemName}`;

            // Find matching material in costData
            let materialData;
            if (itemHrid === '/items/coin') {
                materialData = {
                    itemHrid: '/items/coin',
                    count: costData.coins,
                    marketPrice: 1,
                    totalValue: costData.coins
                };
            } else {
                materialData = costData.materials.find(m => m.itemHrid === itemHrid);
            }

            if (!materialData) continue;

            // Skip coins (no pricing needed)
            if (materialData.itemHrid === '/items/coin') {
                // Add empty cell to maintain grid structure
                this.addEmptyCell(itemRequirementsGrid, itemContainer);
                continue;
            }

            // Add pricing as a new grid cell to the right
            this.addPricingCell(itemRequirementsGrid, itemContainer, materialData);
        }
    }

    /**
     * Add empty cell for coins to maintain grid structure
     * @param {Element} grid - The requirements grid
     * @param {Element} itemContainer - The item icon container (badge)
     */
    addEmptyCell(grid, itemContainer) {
        const emptyCell = document.createElement('span');
        emptyCell.className = 'mwi-house-pricing-empty HousePanel_itemRequirementCell__3hSBN';

        // Insert immediately after the item badge
        itemContainer.after(emptyCell);
    }

    /**
     * Add pricing as a new grid cell to the right of the item
     * @param {Element} grid - The requirements grid
     * @param {Element} itemContainer - The item icon container (badge)
     * @param {Object} materialData - Material data with pricing
     */
    addPricingCell(grid, itemContainer, materialData) {
        // Check if already augmented
        const nextSibling = itemContainer.nextElementSibling;
        if (nextSibling?.classList.contains('mwi-house-pricing')) {
            return;
        }

        const inventoryCount = houseCostCalculator.getInventoryCount(materialData.itemHrid);
        const hasEnough = inventoryCount >= materialData.count;

        // Create pricing cell
        const pricingCell = document.createElement('span');
        pricingCell.className = 'mwi-house-pricing HousePanel_itemRequirementCell__3hSBN';
        pricingCell.style.cssText = `
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
            font-size: 0.75rem;
            color: ${config.SCRIPT_COLOR_MAIN};
            padding-left: 8px;
            white-space: nowrap;
        `;

        pricingCell.innerHTML = `
            <span style="color: ${config.SCRIPT_COLOR_SECONDARY};">@ ${numberFormatter(materialData.marketPrice)}</span>
            <span style="color: ${config.SCRIPT_COLOR_MAIN}; font-weight: bold;">= ${numberFormatter(materialData.totalValue)}</span>
            <span style="color: ${hasEnough ? '#4ade80' : '#f87171'};">${hasEnough ? '✓' : '✗'} ${numberFormatter(inventoryCount)}</span>
        `;

        // Insert immediately after the item badge
        itemContainer.after(pricingCell);
    }

    /**
     * Add total cost below native costs section
     * @param {Element} costsSection - Native costs section
     * @param {Object} costData - Cost data
     */
    addTotalCost(costsSection, costData) {
        const totalDiv = document.createElement('div');
        totalDiv.className = 'mwi-house-total';
        totalDiv.style.cssText = `
            margin-top: 12px;
            padding-top: 12px;
            border-top: 2px solid ${config.SCRIPT_COLOR_MAIN};
            font-weight: bold;
            font-size: 1rem;
            color: ${config.SCRIPT_COLOR_MAIN};
            text-align: center;
        `;
        totalDiv.textContent = `Total Market Value: ${numberFormatter(costData.totalValue)}`;
        costsSection.appendChild(totalDiv);
    }

    /**
     * Add compact "To Level" section
     * @param {Element} costsSection - Native costs section
     * @param {string} houseRoomHrid - House room HRID
     * @param {number} currentLevel - Current level
     */
    async addCompactToLevel(costsSection, houseRoomHrid, currentLevel) {
        const section = document.createElement('div');
        section.className = 'mwi-house-to-level';
        section.style.cssText = `
            margin-top: 16px;
            padding: 12px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border: 1px solid ${config.SCRIPT_COLOR_SECONDARY};
        `;

        // Compact header with inline dropdown
        const headerRow = document.createElement('div');
        headerRow.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 8px;
        `;

        const label = document.createElement('span');
        label.style.cssText = `
            color: ${config.SCRIPT_COLOR_MAIN};
            font-weight: bold;
            font-size: 0.875rem;
        `;
        label.textContent = 'Cumulative to Level:';

        const dropdown = document.createElement('select');
        dropdown.style.cssText = `
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid ${config.SCRIPT_COLOR_SECONDARY};
            color: ${config.SCRIPT_COLOR_MAIN};
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
        `;

        // Add options
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

        headerRow.appendChild(label);
        headerRow.appendChild(dropdown);
        section.appendChild(headerRow);

        // Cost display container
        const costContainer = document.createElement('div');
        costContainer.className = 'mwi-cumulative-cost-container';
        costContainer.style.cssText = `
            font-size: 0.875rem;
            margin-top: 8px;
        `;
        section.appendChild(costContainer);

        // Initial render
        await this.updateCompactCumulativeDisplay(costContainer, houseRoomHrid, currentLevel, parseInt(dropdown.value));

        // Update on change
        dropdown.addEventListener('change', async () => {
            await this.updateCompactCumulativeDisplay(costContainer, houseRoomHrid, currentLevel, parseInt(dropdown.value));
        });

        costsSection.parentElement.appendChild(section);
    }

    /**
     * Update compact cumulative display
     * @param {Element} container - Container element
     * @param {string} houseRoomHrid - House room HRID
     * @param {number} currentLevel - Current level
     * @param {number} targetLevel - Target level
     */
    async updateCompactCumulativeDisplay(container, houseRoomHrid, currentLevel, targetLevel) {
        container.innerHTML = '';

        const costData = await houseCostCalculator.calculateCumulativeCost(houseRoomHrid, currentLevel, targetLevel);

        // Compact material list matching top format
        const materialsList = document.createElement('div');
        materialsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
        `;

        // Coins first
        if (costData.coins > 0) {
            const coinRow = this.createCompactMaterialRow({
                itemHrid: '/items/coin',
                count: costData.coins,
                totalValue: costData.coins
            });
            materialsList.appendChild(coinRow);
        }

        // Materials
        for (const material of costData.materials) {
            const row = this.createCompactMaterialRow(material);
            materialsList.appendChild(row);
        }

        container.appendChild(materialsList);

        // Total
        const totalDiv = document.createElement('div');
        totalDiv.style.cssText = `
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-weight: bold;
            color: ${config.SCRIPT_COLOR_MAIN};
            text-align: center;
        `;
        totalDiv.textContent = `Total: ${numberFormatter(costData.totalValue)}`;
        container.appendChild(totalDiv);
    }

    /**
     * Create compact material row matching top section format
     * @param {Object} material - Material data
     * @returns {HTMLElement} Row element
     */
    createCompactMaterialRow(material) {
        const itemName = houseCostCalculator.getItemName(material.itemHrid);
        const inventoryCount = houseCostCalculator.getInventoryCount(material.itemHrid);
        const hasEnough = inventoryCount >= material.count;

        // Create a row that mimics the construction costs format
        const row = document.createElement('div');
        row.style.cssText = `
            display: grid;
            grid-template-columns: auto auto auto auto;
            align-items: center;
            gap: 8px;
            margin: 4px 0;
        `;

        // Inventory / Required
        const countsSpan = document.createElement('span');
        countsSpan.style.cssText = `
            color: ${hasEnough ? 'white' : '#f87171'};
            text-align: right;
        `;
        countsSpan.textContent = `${numberFormatter(inventoryCount)} / ${numberFormatter(material.count)}`;

        // Item badge (mimicking the game's item badges)
        const badgeSpan = document.createElement('span');
        badgeSpan.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
        `;
        badgeSpan.textContent = itemName;

        // Pricing info (only for non-coins)
        const pricingSpan = document.createElement('span');
        if (material.itemHrid !== '/items/coin') {
            pricingSpan.style.cssText = `
                display: flex;
                gap: 8px;
                font-size: 0.75rem;
                white-space: nowrap;
            `;
            pricingSpan.innerHTML = `
                <span style="color: ${config.SCRIPT_COLOR_SECONDARY};">@ ${numberFormatter(material.marketPrice)}</span>
                <span style="color: ${config.SCRIPT_COLOR_MAIN}; font-weight: bold;">= ${numberFormatter(material.totalValue)}</span>
                <span style="color: ${hasEnough ? '#4ade80' : '#f87171'};">${hasEnough ? '✓' : '✗'} ${numberFormatter(inventoryCount)}</span>
            `;
        }

        // Empty span for grid alignment
        const emptySpan = document.createElement('span');

        row.appendChild(countsSpan);
        row.appendChild(badgeSpan);
        row.appendChild(pricingSpan);
        row.appendChild(emptySpan);

        return row;
    }

    /**
     * Disable the feature
     */
    disable() {
        // Remove all MWI-added elements
        document.querySelectorAll('.mwi-house-pricing, .mwi-house-pricing-empty, .mwi-house-total, .mwi-house-to-level').forEach(el => el.remove());

        // Restore all grid columns
        document.querySelectorAll('[class*="HousePanel_itemRequirements"]').forEach(grid => {
            grid.style.gridTemplateColumns = '';
        });

        this.currentModalContent = null;
        this.isActive = false;
    }
}

// Create and export singleton instance
const houseCostDisplay = new HouseCostDisplay();

export default houseCostDisplay;
