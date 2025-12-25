/**
 * Tea Buff Parser Utility
 * Calculates efficiency bonuses from active tea buffs
 *
 * Tea efficiency comes from two buff types:
 * 1. /buff_types/efficiency - Generic efficiency (e.g., Efficiency Tea: 10%)
 * 2. /buff_types/{skill}_level - Skill level bonuses (e.g., Brewing Tea: +3 levels)
 *
 * All tea effects scale with Drink Concentration equipment stat.
 */

import { getEnhancementMultiplier } from './enhancement-multipliers.js';

/**
 * Generic tea buff parser - handles all tea buff types with consistent logic
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (as decimal, e.g., 0.12 for 12%)
 * @param {Object} config - Parser configuration
 * @param {Array<string>} config.buffTypeHrids - Buff type HRIDs to check (e.g., ['/buff_types/artisan'])
 * @returns {number} Total buff bonus
 *
 * @example
 * // Parse artisan bonus
 * parseTeaBuff(drinks, items, 0.12, { buffTypeHrids: ['/buff_types/artisan'] })
 */
function parseTeaBuff(activeDrinks, itemDetailMap, drinkConcentration, config) {
    if (!activeDrinks || activeDrinks.length === 0) {
        return 0; // No active teas
    }

    if (!itemDetailMap) {
        return 0; // Missing required data
    }

    const { buffTypeHrids } = config;
    let totalBonus = 0;

    // Process each active tea/drink
    for (const drink of activeDrinks) {
        if (!drink || !drink.itemHrid) {
            continue; // Empty slot
        }

        const itemDetails = itemDetailMap[drink.itemHrid];
        if (!itemDetails || !itemDetails.consumableDetail || !itemDetails.consumableDetail.buffs) {
            continue; // Not a consumable or has no buffs
        }

        // Check each buff on this tea
        for (const buff of itemDetails.consumableDetail.buffs) {
            // Check if this buff matches any of the target types
            if (buffTypeHrids.includes(buff.typeHrid)) {
                const baseValue = buff.flatBoost;
                const scaledValue = baseValue * (1 + drinkConcentration);
                totalBonus += scaledValue;
            }
        }
    }

    return totalBonus;
}

/**
 * Parse tea efficiency bonuses for a specific action type
 * @param {string} actionTypeHrid - Action type HRID (e.g., "/action_types/brewing")
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (as decimal, e.g., 0.12 for 12%)
 * @returns {number} Total tea efficiency bonus as percentage (e.g., 12 for 12%)
 *
 * @example
 * // With Efficiency Tea (10% base) and 12% Drink Concentration:
 * parseTeaEfficiency("/action_types/brewing", activeDrinks, items, 0.12)
 * // Returns: 11.2 (10% × 1.12 = 11.2%)
 */
export function parseTeaEfficiency(actionTypeHrid, activeDrinks, itemDetailMap, drinkConcentration = 0) {
    if (!activeDrinks || activeDrinks.length === 0) {
        return 0; // No active teas
    }

    if (!actionTypeHrid || !itemDetailMap) {
        return 0; // Missing required data
    }

    let totalEfficiency = 0;

    // Extract skill name from action type for skill-specific tea detection
    // e.g., "/action_types/brewing" -> "brewing"
    const skillName = actionTypeHrid.replace('/action_types/', '');
    const skillLevelBuffType = `/buff_types/${skillName}_level`;

    // Process each active tea/drink
    for (const drink of activeDrinks) {
        if (!drink || !drink.itemHrid) {
            continue; // Empty slot
        }

        const itemDetails = itemDetailMap[drink.itemHrid];
        if (!itemDetails || !itemDetails.consumableDetail || !itemDetails.consumableDetail.buffs) {
            continue; // Not a consumable or has no buffs
        }

        // Check each buff on this tea
        for (const buff of itemDetails.consumableDetail.buffs) {
            // Generic efficiency buff (e.g., Efficiency Tea)
            if (buff.typeHrid === '/buff_types/efficiency') {
                const baseEfficiency = buff.flatBoost * 100; // Convert to percentage
                const scaledEfficiency = baseEfficiency * (1 + drinkConcentration);
                totalEfficiency += scaledEfficiency;
            }
            // Skill-specific level buff (e.g., Brewing Tea: +3 Brewing levels)
            // Level bonuses translate to efficiency: +1 level = +1% efficiency
            else if (buff.typeHrid === skillLevelBuffType) {
                const levelBonus = buff.flatBoost;
                const scaledBonus = levelBonus * (1 + drinkConcentration);
                totalEfficiency += scaledBonus;
            }
        }
    }

    return totalEfficiency;
}

/**
 * Parse tea efficiency bonuses with breakdown by individual tea
 * @param {string} actionTypeHrid - Action type HRID (e.g., "/action_types/brewing")
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (as decimal, e.g., 0.12 for 12%)
 * @returns {Array<{name: string, efficiency: number, baseEfficiency: number, dcContribution: number}>} Array of tea contributions
 *
 * @example
 * // With Efficiency Tea (10% base) and Ultra Cheesesmithing Tea (6% base) with 12% DC:
 * parseTeaEfficiencyBreakdown("/action_types/cheesesmithing", activeDrinks, items, 0.12)
 * // Returns: [
 * //   { name: "Efficiency Tea", efficiency: 11.2, baseEfficiency: 10.0, dcContribution: 1.2 },
 * //   { name: "Ultra Cheesesmithing Tea", efficiency: 6.72, baseEfficiency: 6.0, dcContribution: 0.72 }
 * // ]
 */
export function parseTeaEfficiencyBreakdown(actionTypeHrid, activeDrinks, itemDetailMap, drinkConcentration = 0) {
    if (!activeDrinks || activeDrinks.length === 0) {
        return []; // No active teas
    }

    if (!actionTypeHrid || !itemDetailMap) {
        return []; // Missing required data
    }

    const teaBreakdown = [];

    // Extract skill name from action type for skill-specific tea detection
    // e.g., "/action_types/brewing" -> "brewing"
    const skillName = actionTypeHrid.replace('/action_types/', '');
    const skillLevelBuffType = `/buff_types/${skillName}_level`;

    // Process each active tea/drink
    for (const drink of activeDrinks) {
        if (!drink || !drink.itemHrid) {
            continue; // Empty slot
        }

        const itemDetails = itemDetailMap[drink.itemHrid];
        if (!itemDetails || !itemDetails.consumableDetail || !itemDetails.consumableDetail.buffs) {
            continue; // Not a consumable or has no buffs
        }

        let baseEfficiency = 0;
        let totalEfficiency = 0;

        // Check each buff on this tea
        for (const buff of itemDetails.consumableDetail.buffs) {
            // Generic efficiency buff (e.g., Efficiency Tea)
            if (buff.typeHrid === '/buff_types/efficiency') {
                const baseValue = buff.flatBoost * 100; // Convert to percentage
                const scaledValue = baseValue * (1 + drinkConcentration);
                baseEfficiency += baseValue;
                totalEfficiency += scaledValue;
            }
            // Skill-specific level buff (e.g., Brewing Tea: +3 Brewing levels)
            // Level bonuses translate to efficiency: +1 level = +1% efficiency
            else if (buff.typeHrid === skillLevelBuffType) {
                const baseValue = buff.flatBoost;
                const scaledValue = baseValue * (1 + drinkConcentration);
                baseEfficiency += baseValue;
                totalEfficiency += scaledValue;
            }
        }

        // Only add to breakdown if this tea contributes efficiency
        if (totalEfficiency > 0) {
            teaBreakdown.push({
                name: itemDetails.name,
                efficiency: totalEfficiency,
                baseEfficiency: baseEfficiency,
                dcContribution: totalEfficiency - baseEfficiency
            });
        }
    }

    return teaBreakdown;
}

/**
 * Get Drink Concentration stat from equipped items
 * @param {Map} characterEquipment - Equipment map from dataManager.getEquipment()
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @returns {number} Total drink concentration as decimal (e.g., 0.12 for 12%)
 *
 * @example
 * getDrinkConcentration(equipment, items)
 * // Returns: 0.12 (if wearing items with 12% total drink concentration)
 */
export function getDrinkConcentration(characterEquipment, itemDetailMap) {
    if (!characterEquipment || characterEquipment.size === 0) {
        return 0; // No equipment
    }

    if (!itemDetailMap) {
        return 0; // Missing item data
    }

    let totalDrinkConcentration = 0;

    // Iterate through all equipped items
    for (const [slotHrid, equippedItem] of characterEquipment) {
        const itemDetails = itemDetailMap[equippedItem.itemHrid];

        if (!itemDetails || !itemDetails.equipmentDetail) {
            continue; // Not an equipment item
        }

        const noncombatStats = itemDetails.equipmentDetail.noncombatStats;
        if (!noncombatStats) {
            continue; // No noncombat stats
        }

        // Check for drink concentration stat
        const baseDrinkConcentration = noncombatStats.drinkConcentration;
        if (!baseDrinkConcentration || baseDrinkConcentration <= 0) {
            continue; // No drink concentration on this item
        }

        // Get enhancement level from equipped item
        const enhancementLevel = equippedItem.enhancementLevel || 0;

        // Calculate scaled drink concentration with enhancement
        // Uses enhancement multiplier table (e.g., +10 = 1.29× for 1× slots like pouch)
        const enhancementMultiplier = getEnhancementMultiplier(itemDetails, enhancementLevel);
        const scaledDrinkConcentration = baseDrinkConcentration * enhancementMultiplier;

        totalDrinkConcentration += scaledDrinkConcentration;
    }

    return totalDrinkConcentration;
}

/**
 * Parse Artisan bonus from active tea buffs
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (as decimal, e.g., 0.12 for 12%)
 * @returns {number} Artisan material reduction as decimal (e.g., 0.112 for 11.2% reduction)
 *
 * @example
 * // With Artisan Tea (10% base) and 12% Drink Concentration:
 * parseArtisanBonus(activeDrinks, items, 0.12)
 * // Returns: 0.112 (10% × 1.12 = 11.2% reduction)
 */
export function parseArtisanBonus(activeDrinks, itemDetailMap, drinkConcentration = 0) {
    return parseTeaBuff(activeDrinks, itemDetailMap, drinkConcentration, {
        buffTypeHrids: ['/buff_types/artisan']
    });
}

/**
 * Parse Gourmet bonus from active tea buffs
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (as decimal, e.g., 0.12 for 12%)
 * @returns {number} Gourmet bonus chance as decimal (e.g., 0.1344 for 13.44% bonus items)
 *
 * @example
 * // With Gourmet Tea (12% base) and 12% Drink Concentration:
 * parseGourmetBonus(activeDrinks, items, 0.12)
 * // Returns: 0.1344 (12% × 1.12 = 13.44% bonus items)
 */
export function parseGourmetBonus(activeDrinks, itemDetailMap, drinkConcentration = 0) {
    return parseTeaBuff(activeDrinks, itemDetailMap, drinkConcentration, {
        buffTypeHrids: ['/buff_types/gourmet']
    });
}

/**
 * Parse Processing bonus from active tea buffs
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (as decimal, e.g., 0.12 for 12%)
 * @returns {number} Processing conversion chance as decimal (e.g., 0.168 for 16.8% conversion chance)
 *
 * @example
 * // With Processing Tea (15% base) and 12% Drink Concentration:
 * parseProcessingBonus(activeDrinks, items, 0.12)
 * // Returns: 0.168 (15% × 1.12 = 16.8% conversion chance)
 */
export function parseProcessingBonus(activeDrinks, itemDetailMap, drinkConcentration = 0) {
    return parseTeaBuff(activeDrinks, itemDetailMap, drinkConcentration, {
        buffTypeHrids: ['/buff_types/processing']
    });
}

/**
 * Parse Action Level bonus from active tea buffs
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (NOT used for Action Level - doesn't scale)
 * @returns {number} Action Level bonus as flat number (e.g., 5.0 for +5 levels)
 *
 * @example
 * // With Artisan Tea (+5 Action Level base):
 * parseActionLevelBonus(activeDrinks, items, drinkConcentration)
 * // Returns: 5.0 (Action Level does NOT scale with DC)
 */
export function parseActionLevelBonus(activeDrinks, itemDetailMap, drinkConcentration = 0) {
    // Action Level bonuses do NOT scale with Drink Concentration
    return parseTeaBuff(activeDrinks, itemDetailMap, 0, {
        buffTypeHrids: ['/buff_types/action_level']
    });
}

/**
 * Parse Action Level bonus with breakdown by individual tea
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (NOT used - Action Level doesn't scale)
 * @returns {Array<{name: string, actionLevel: number, baseActionLevel: number, dcContribution: number}>} Array of tea contributions
 *
 * @example
 * // With Artisan Tea (+5 Action Level base):
 * parseActionLevelBonusBreakdown(activeDrinks, items, drinkConcentration)
 * // Returns: [{ name: "Artisan Tea", actionLevel: 5.0, baseActionLevel: 5.0, dcContribution: 0.0 }]
 */
export function parseActionLevelBonusBreakdown(activeDrinks, itemDetailMap, drinkConcentration = 0) {
    if (!activeDrinks || activeDrinks.length === 0) {
        return []; // No active teas
    }

    if (!itemDetailMap) {
        return []; // Missing required data
    }

    const teaBreakdown = [];

    // Process each active tea/drink
    for (const drink of activeDrinks) {
        if (!drink || !drink.itemHrid) {
            continue; // Empty slot
        }

        const itemDetails = itemDetailMap[drink.itemHrid];
        if (!itemDetails || !itemDetails.consumableDetail || !itemDetails.consumableDetail.buffs) {
            continue; // Not a consumable or has no buffs
        }

        let baseActionLevel = 0;
        let totalActionLevel = 0;

        // Check each buff on this tea
        for (const buff of itemDetails.consumableDetail.buffs) {
            // Action Level buff (e.g., Artisan Tea: +5 Action Level)
            if (buff.typeHrid === '/buff_types/action_level') {
                const baseValue = buff.flatBoost;
                // Action Level does NOT scale with Drink Concentration
                const scaledValue = baseValue; // No DC scaling
                baseActionLevel += baseValue;
                totalActionLevel += scaledValue;
            }
        }

        // Only add to breakdown if this tea contributes action level
        if (totalActionLevel > 0) {
            teaBreakdown.push({
                name: itemDetails.name,
                actionLevel: totalActionLevel,
                baseActionLevel: baseActionLevel,
                dcContribution: 0 // Always 0 - Action Level doesn't scale with DC
            });
        }
    }

    return teaBreakdown;
}

/**
 * Parse Gathering bonus from active tea buffs
 * @param {Array} activeDrinks - Array of active drink items from actionTypeDrinkSlotsMap
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @param {number} drinkConcentration - Drink Concentration stat (as decimal, e.g., 0.12 for 12%)
 * @returns {number} Gathering quantity bonus as decimal (e.g., 0.168 for 16.8% more items)
 *
 * @example
 * // With Gathering Tea (+15% base) and 12% Drink Concentration:
 * parseGatheringBonus(activeDrinks, items, 0.12)
 * // Returns: 0.168 (15% × 1.12 = 16.8% gathering quantity)
 */
export function parseGatheringBonus(activeDrinks, itemDetailMap, drinkConcentration = 0) {
    return parseTeaBuff(activeDrinks, itemDetailMap, drinkConcentration, {
        buffTypeHrids: ['/buff_types/gathering']
    });
}

export default {
    parseTeaEfficiency,
    getDrinkConcentration,
    parseArtisanBonus,
    parseGourmetBonus,
    parseProcessingBonus,
    parseActionLevelBonus,
    parseGatheringBonus
};
