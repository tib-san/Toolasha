/**
 * Combat Score Calculator
 * Calculates player combat readiness score based on:
 * - House Score: Cost of battle houses
 * - Ability Score: Cost to reach current ability levels
 * - Equipment Score: Cost to enhance equipped items
 */

import { calculateAbilityCost } from '../../utils/ability-cost-calculator.js';
import { calculateBattleHousesCost } from '../../utils/house-cost-calculator.js';
import dataManager from '../../core/data-manager.js';
import marketAPI from '../../api/marketplace.js';
import { calculateEnhancementPath } from '../enhancement/tooltip-enhancement.js';
import { getEnhancingParams } from '../../utils/enhancement-config.js';

/**
 * Calculate combat score from profile data
 * @param {Object} profileData - Profile data from game
 * @returns {Promise<Object>} {total, house, ability, equipment, breakdown}
 */
export async function calculateCombatScore(profileData) {
    try {
        // 1. Calculate House Score
        const houseResult = calculateHouseScore(profileData);

        // 2. Calculate Ability Score
        const abilityResult = calculateAbilityScore(profileData);

        // 3. Calculate Equipment Score
        const equipmentResult = calculateEquipmentScore(profileData);

        const totalScore = houseResult.score + abilityResult.score + equipmentResult.score;

        return {
            total: totalScore,
            house: houseResult.score,
            ability: abilityResult.score,
            equipment: equipmentResult.score,
            equipmentHidden: profileData.profile?.hideWearableItems || false,
            breakdown: {
                houses: houseResult.breakdown,
                abilities: abilityResult.breakdown,
                equipment: equipmentResult.breakdown
            }
        };
    } catch (error) {
        console.error('[CombatScore] Error calculating score:', error);
        return {
            total: 0,
            house: 0,
            ability: 0,
            equipment: 0,
            equipmentHidden: false,
            breakdown: { houses: [], abilities: [], equipment: [] }
        };
    }
}

/**
 * Calculate house score from battle houses
 * @param {Object} profileData - Profile data
 * @returns {Object} {score, breakdown}
 */
function calculateHouseScore(profileData) {
    const characterHouseRooms = profileData.profile?.characterHouseRoomMap || {};

    const { totalCost, breakdown } = calculateBattleHousesCost(characterHouseRooms);

    // Convert to score (cost / 1 million)
    const score = totalCost / 1_000_000;

    // Format breakdown for display
    const formattedBreakdown = breakdown.map(house => ({
        name: `${house.name} ${house.level}`,
        value: (house.cost / 1_000_000).toFixed(1)
    }));

    return { score, breakdown: formattedBreakdown };
}

/**
 * Calculate ability score from equipped abilities
 * @param {Object} profileData - Profile data
 * @returns {Object} {score, breakdown}
 */
function calculateAbilityScore(profileData) {
    const characterAbilities = profileData.profile?.characterAbilities || [];

    let totalCost = 0;
    const breakdown = [];

    for (const ability of characterAbilities) {
        if (!ability.abilityHrid || ability.level === 0) continue;

        const cost = calculateAbilityCost(ability.abilityHrid, ability.level);
        totalCost += cost;

        // Format ability name for display
        const abilityName = ability.abilityHrid
            .replace('/abilities/', '')
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        breakdown.push({
            name: `${abilityName} ${ability.level}`,
            value: (cost / 1_000_000).toFixed(1)
        });
    }

    // Convert to score (cost / 1 million)
    const score = totalCost / 1_000_000;

    // Sort by value descending
    breakdown.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

    return { score, breakdown };
}

/**
 * Calculate equipment score from equipped items
 * @param {Object} profileData - Profile data
 * @returns {Object} {score, breakdown}
 */
function calculateEquipmentScore(profileData) {
    const equippedItems = profileData.profile?.wearableItemMap || {};
    const hideEquipment = profileData.profile?.hideWearableItems || false;

    // If equipment is hidden, return 0
    if (hideEquipment) {
        return { score: 0, breakdown: [] };
    }

    const gameData = dataManager.getInitClientData();
    if (!gameData) return { score: 0, breakdown: [] };

    let totalValue = 0;
    const breakdown = [];

    for (const [slot, itemData] of Object.entries(equippedItems)) {
        if (!itemData?.itemHrid) continue;

        const itemHrid = itemData.itemHrid;
        const itemDetails = gameData.itemDetailMap[itemHrid];
        if (!itemDetails) continue;

        // Get enhancement level from itemData (separate field, not in HRID)
        const enhancementLevel = itemData.enhancementLevel || 0;

        let itemCost = 0;

        // For enhancement level > 1, calculate total enhancement cost using existing calculator
        if (enhancementLevel > 1) {
            const enhancementParams = getEnhancingParams();
            const enhancementPath = calculateEnhancementPath(itemHrid, enhancementLevel, enhancementParams);

            if (enhancementPath && enhancementPath.optimalStrategy) {
                itemCost = enhancementPath.optimalStrategy.totalCost;
            } else {
                // Fallback to market price if enhancement calculation fails
                const prices = marketAPI.getPrice(itemHrid, 0);
                if (prices) {
                    const ask = prices.ask || 0;
                    const bid = prices.bid || 0;
                    itemCost = (ask + bid) / 2;
                }
            }
        } else {
            // For 0 or 1, just use market price
            const prices = marketAPI.getPrice(itemHrid, 0);
            if (prices) {
                const ask = prices.ask || 0;
                const bid = prices.bid || 0;
                itemCost = (ask + bid) / 2;
            }
        }

        totalValue += itemCost;

        // Format item name for display
        const itemName = itemDetails.name || itemHrid.replace('/items/', '');
        const displayName = enhancementLevel > 0 ? `${itemName} +${enhancementLevel}` : itemName;

        breakdown.push({
            name: displayName,
            value: (itemCost / 1_000_000).toFixed(1)
        });
    }

    // Convert to score (value / 1 million)
    const score = totalValue / 1_000_000;

    // Sort by value descending
    breakdown.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

    return { score, breakdown };
}
