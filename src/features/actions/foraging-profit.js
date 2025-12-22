/**
 * Foraging Profit Calculator
 *
 * Calculates comprehensive profit/hour for Foraging actions including:
 * - All drop table items at market prices
 * - Drink consumption costs
 * - Equipment speed bonuses
 * - Efficiency buffs (level, house, tea, equipment)
 * - Gourmet tea bonus items
 * - Market tax (2%)
 */

import marketAPI from '../../api/marketplace.js';
import dataManager from '../../core/data-manager.js';
import { parseEquipmentSpeedBonuses, parseEssenceFindBonus, parseRareFindBonus } from '../../utils/equipment-parser.js';
import { parseTeaEfficiency, parseGourmetBonus, getDrinkConcentration } from '../../utils/tea-parser.js';
import { calculateHouseRareFind } from '../../utils/house-efficiency.js';
import { stackAdditive } from '../../utils/efficiency.js';
import { formatWithSeparator } from '../../utils/formatters.js';
import expectedValueCalculator from '../market/expected-value-calculator.js';

/**
 * Calculate comprehensive profit for a Foraging action
 * @param {string} actionHrid - Action HRID (e.g., "/actions/foraging/asteroid_belt")
 * @returns {Object|null} Profit data or null if not applicable
 */
export async function calculateForagingProfit(actionHrid) {
    // Get action details
    const gameData = dataManager.getInitClientData();
    const actionDetail = gameData.actionDetailMap[actionHrid];

    if (!actionDetail) {
        return null;
    }

    // Only process Foraging actions with drop tables
    if (!actionDetail.type.includes('foraging')) {
        return null;
    }

    if (!actionDetail.dropTable || actionDetail.dropTable.length <= 1) {
        return null;
    }

    // Ensure market data is loaded
    const marketData = await marketAPI.fetch();
    if (!marketData) {
        return null;
    }

    // Get character data
    const characterData = dataManager.getCharacterData();
    const equipment = dataManager.getEquipment();
    const skills = dataManager.getSkills();
    const houseRooms = characterData.houseRooms || [];
    const activeBuffs = characterData.buffs || [];

    // Calculate action time per action (with speed bonuses)
    const baseTimePerActionSec = actionDetail.baseTimeCost / 1000000000;
    const speedBonus = parseEquipmentSpeedBonuses(
        equipment,
        actionDetail.type,
        gameData.itemDetailMap
    );
    const actualTimePerActionSec = baseTimePerActionSec / (1 + speedBonus / 100);

    // Calculate actions per hour
    let actionsPerHour = 3600 / actualTimePerActionSec;

    // Get drink slots for this action type
    const drinkSlots = gameData.actionTypeDrinkSlotsMap?.[actionDetail.type] || [];

    // Get drink concentration from equipment
    const drinkConcentration = getDrinkConcentration(equipment, gameData.itemDetailMap);

    // Parse tea buffs
    const teaEfficiency = parseTeaEfficiency(
        actionDetail.type,
        drinkSlots,
        gameData.itemDetailMap,
        drinkConcentration
    );

    const gourmetBonus = parseGourmetBonus(
        drinkSlots,
        gameData.itemDetailMap,
        drinkConcentration
    );

    // Calculate drink consumption costs
    let drinkCostPerHour = 0;
    for (const drink of drinkSlots) {
        if (!drink || !drink.itemHrid) {
            continue;
        }
        const askPrice = marketData.marketData[drink.itemHrid]?.[0]?.a || 0;
        drinkCostPerHour += askPrice * 12; // 12 drinks per hour (5min each)
    }

    // Calculate level efficiency bonus
    const requiredLevel = actionDetail.levelRequirement?.level || 1;
    const skillHrid = actionDetail.levelRequirement?.skillHrid;
    let currentLevel = requiredLevel;
    for (const skill of skills) {
        if (skill.skillHrid === skillHrid) {
            currentLevel = skill.level;
            break;
        }
    }
    const levelEfficiency = Math.max(0, currentLevel - requiredLevel);

    // Calculate house efficiency bonus
    let houseEfficiency = 0;
    for (const room of houseRooms) {
        const roomDetail = gameData.houseRoomDetailMap?.[room.houseRoomHrid];
        if (roomDetail?.actionTypeWhitelist?.includes(actionDetail.type)) {
            houseEfficiency += (room.level || 0) * 1.5;
        }
    }

    // Calculate equipment efficiency bonus (specific items like gathering charms)
    let equipmentEfficiency = 0;
    for (const [slot, equippedItem] of Object.entries(equipment)) {
        if (!equippedItem?.itemHrid) continue;

        const itemDetail = gameData.itemDetailMap[equippedItem.itemHrid];
        if (!itemDetail?.equipmentDetail?.noncombatStats) continue;

        const stats = itemDetail.equipmentDetail.noncombatStats;
        if (stats.efficiency) {
            // Base efficiency
            let efficiency = stats.efficiency;

            // Apply enhancement scaling (only accessories/charms get 5x)
            const slotType = itemDetail.equipmentDetail.slot;
            const isAccessory = [
                '/equipment_types/charm',
                '/equipment_types/neck',
                '/equipment_types/earrings',
                '/equipment_types/ring',
                '/equipment_types/back',
                '/equipment_types/trinket'
            ].includes(slotType);

            const enhancementLevel = equippedItem.enhancementLevel || 0;
            if (enhancementLevel > 0) {
                const enhancementBonus = getEnhancementBonus(enhancementLevel);
                const multiplier = isAccessory ? 5 : 1;
                efficiency *= (1 + (enhancementBonus / 100) * multiplier);
            }

            equipmentEfficiency += efficiency;
        }
    }

    // Total efficiency (all additive)
    const totalEfficiency = stackAdditive(
        levelEfficiency,
        houseEfficiency,
        teaEfficiency,
        equipmentEfficiency
    );

    // Apply efficiency to actions per hour
    actionsPerHour *= (1 + totalEfficiency / 100);

    // Calculate revenue from drop table
    let revenuePerHour = 0;
    const dropTable = actionDetail.dropTable;

    for (const drop of dropTable) {
        const bidPrice = marketData.marketData[drop.itemHrid]?.[0]?.b || 0;
        const avgAmount = (drop.minCount + drop.maxCount) / 2;
        const itemsPerHour = actionsPerHour * drop.dropRate * avgAmount;

        // Apply market tax (2%)
        const bidAfterTax = bidPrice * 0.98;

        revenuePerHour += itemsPerHour * bidAfterTax;

        // Add Gourmet tea bonus items (12% chance for +100% items, scales with drink concentration)
        if (gourmetBonus > 0) {
            const bonusItemsPerHour = itemsPerHour * (gourmetBonus / 100);
            revenuePerHour += bonusItemsPerHour * bidAfterTax;
        }
    }

    // Calculate bonus revenue from essence and rare find drops
    const bonusRevenue = calculateBonusRevenue(
        actionDetail,
        actionsPerHour,
        equipment,
        gameData.itemDetailMap
    );

    // Add bonus revenue to total revenue
    revenuePerHour += bonusRevenue.totalBonusRevenue;

    // Calculate net profit
    const profitPerHour = revenuePerHour - drinkCostPerHour;
    const profitPerDay = profitPerHour * 24;

    return {
        profitPerHour,
        profitPerDay,
        revenuePerHour,
        drinkCostPerHour,
        actionsPerHour,
        totalEfficiency,
        speedBonus,
        bonusRevenue,              // Essence and rare find details
        details: {
            levelEfficiency,
            houseEfficiency,
            teaEfficiency,
            equipmentEfficiency,
            gourmetBonus
        }
    };
}

/**
 * Get enhancement bonus percentage for a given level
 * @param {number} level - Enhancement level (1-20)
 * @returns {number} Bonus percentage
 */
function getEnhancementBonus(level) {
    const bonuses = {
        1: 2.0, 2: 4.2, 3: 6.6, 4: 9.2, 5: 12.0,
        6: 15.0, 7: 18.2, 8: 21.6, 9: 25.2, 10: 29.0,
        11: 33.4, 12: 38.4, 13: 44.0, 14: 50.2, 15: 57.0,
        16: 64.4, 17: 72.4, 18: 81.0, 19: 90.2, 20: 100.0
    };
    return bonuses[level] || 0;
}

/**
 * Calculate bonus revenue from essence and rare find drops
 * @param {Object} actionDetails - Action details from game data
 * @param {number} actionsPerHour - Actions per hour
 * @param {Map} characterEquipment - Equipment map
 * @param {Object} itemDetailMap - Item details map
 * @returns {Object} Bonus revenue data with essence and rare find drops
 */
function calculateBonusRevenue(actionDetails, actionsPerHour, characterEquipment, itemDetailMap) {
    // Get Essence Find bonus from equipment
    const essenceFindBonus = parseEssenceFindBonus(characterEquipment, itemDetailMap);

    // Get Rare Find bonus from BOTH equipment and house rooms
    const equipmentRareFindBonus = parseRareFindBonus(characterEquipment, actionDetails.type, itemDetailMap);
    const houseRareFindBonus = calculateHouseRareFind();
    const rareFindBonus = equipmentRareFindBonus + houseRareFindBonus;

    const bonusDrops = [];
    let totalBonusRevenue = 0;

    // Process essence drops
    if (actionDetails.essenceDropTable && actionDetails.essenceDropTable.length > 0) {
        for (const drop of actionDetails.essenceDropTable) {
            const itemDetails = itemDetailMap[drop.itemHrid];
            if (!itemDetails) continue;

            // Calculate average drop count
            const avgCount = (drop.minCount + drop.maxCount) / 2;

            // Apply Essence Find multiplier to drop rate
            const finalDropRate = drop.dropRate * (1 + essenceFindBonus / 100);

            // Expected drops per hour
            const dropsPerHour = actionsPerHour * finalDropRate * avgCount;

            // Get price: Check if openable container (use EV), otherwise market price
            let itemPrice = 0;
            if (itemDetails.isOpenable) {
                // Use expected value for openable containers
                itemPrice = expectedValueCalculator.getCachedValue(drop.itemHrid) || 0;
            } else {
                // Use market price for regular items
                const price = marketAPI.getPrice(drop.itemHrid, 0);
                itemPrice = price?.bid || 0; // Use bid price (instant sell)
            }

            // Revenue per hour from this drop
            const revenuePerHour = dropsPerHour * itemPrice;

            bonusDrops.push({
                itemHrid: drop.itemHrid,
                itemName: itemDetails.name,
                dropRate: finalDropRate,
                dropsPerHour,
                priceEach: itemPrice,
                revenuePerHour,
                type: 'essence'
            });

            totalBonusRevenue += revenuePerHour;
        }
    }

    // Process rare find drops
    if (actionDetails.rareDropTable && actionDetails.rareDropTable.length > 0) {
        for (const drop of actionDetails.rareDropTable) {
            const itemDetails = itemDetailMap[drop.itemHrid];
            if (!itemDetails) continue;

            // Calculate average drop count
            const avgCount = (drop.minCount + drop.maxCount) / 2;

            // Apply Rare Find multiplier to drop rate
            const finalDropRate = drop.dropRate * (1 + rareFindBonus / 100);

            // Expected drops per hour
            const dropsPerHour = actionsPerHour * finalDropRate * avgCount;

            // Get price: Check if openable container (use EV), otherwise market price
            let itemPrice = 0;
            if (itemDetails.isOpenable) {
                // Use expected value for openable containers
                itemPrice = expectedValueCalculator.getCachedValue(drop.itemHrid) || 0;
            } else {
                // Use market price for regular items
                const price = marketAPI.getPrice(drop.itemHrid, 0);
                itemPrice = price?.bid || 0; // Use bid price (instant sell)
            }

            // Revenue per hour from this drop
            const revenuePerHour = dropsPerHour * itemPrice;

            bonusDrops.push({
                itemHrid: drop.itemHrid,
                itemName: itemDetails.name,
                dropRate: finalDropRate,
                dropsPerHour,
                priceEach: itemPrice,
                revenuePerHour,
                type: 'rare_find'
            });

            totalBonusRevenue += revenuePerHour;
        }
    }

    return {
        essenceFindBonus,       // Essence Find % from equipment
        rareFindBonus,          // Rare Find % from equipment + house rooms (combined)
        bonusDrops,             // Array of all bonus drops with details
        totalBonusRevenue       // Total revenue/hour from all bonus drops
    };
}

/**
 * Format profit data into HTML for display
 * @param {Object} profitData - Profit data from calculateForagingProfit
 * @returns {string} HTML string
 */
export function formatProfitDisplay(profitData) {
    if (!profitData) {
        return '';
    }

    const lines = [];
    lines.push(`<div style="color: var(--script-color); text-align: left; margin-top: 8px;">`);
    lines.push(`<strong>Overall Profit:</strong>`);
    lines.push(`<br>${formatWithSeparator(Math.round(profitData.profitPerHour))}/hour`);
    lines.push(`, ${formatWithSeparator(Math.round(profitData.profitPerDay))}/day`);

    // Show efficiency breakdown
    lines.push(`<br><span style="font-size: 0.9em; opacity: 0.8;">`);
    lines.push(`(+${profitData.totalEfficiency.toFixed(1)}% efficiency: `);

    const effParts = [];
    if (profitData.details.levelEfficiency > 0) {
        effParts.push(`${profitData.details.levelEfficiency}% level`);
    }
    if (profitData.details.houseEfficiency > 0) {
        effParts.push(`${profitData.details.houseEfficiency.toFixed(1)}% house`);
    }
    if (profitData.details.teaEfficiency > 0) {
        effParts.push(`${profitData.details.teaEfficiency.toFixed(1)}% tea`);
    }
    if (profitData.details.equipmentEfficiency > 0) {
        effParts.push(`${profitData.details.equipmentEfficiency.toFixed(1)}% equip`);
    }
    if (profitData.details.gourmetBonus > 0) {
        effParts.push(`${profitData.details.gourmetBonus.toFixed(1)}% gourmet`);
    }

    lines.push(effParts.join(', '));
    lines.push(`)</span>`);

    // Show bonus revenue breakdown (essences and rare finds)
    if (profitData.bonusRevenue && profitData.bonusRevenue.totalBonusRevenue > 0) {
        lines.push(`<br><span style="font-size: 0.9em; opacity: 0.8;">`);
        lines.push(`Bonus revenue: ${formatWithSeparator(Math.round(profitData.bonusRevenue.totalBonusRevenue))}/hour`);

        const bonusParts = [];
        if (profitData.bonusRevenue.essenceFindBonus > 0) {
            bonusParts.push(`${profitData.bonusRevenue.essenceFindBonus.toFixed(1)}% essence find`);
        }
        if (profitData.bonusRevenue.rareFindBonus > 0) {
            bonusParts.push(`${profitData.bonusRevenue.rareFindBonus.toFixed(1)}% rare find`);
        }

        if (bonusParts.length > 0) {
            lines.push(` (${bonusParts.join(', ')})`);
        }
        lines.push(`</span>`);
    }

    lines.push(`</div>`);

    return lines.join('');
}
