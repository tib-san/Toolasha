/**
 * Equipment Parser Utility
 * Parses equipment speed bonuses for action time calculations
 *
 * PART OF EFFICIENCY SYSTEM (Phase 1 of 3):
 * - Phase 1 ✅: Equipment speed bonuses (this module) + level advantage
 * - Phase 2 ⏳: Community buffs + house rooms (user config)
 * - Phase 3 ⏳: Consumable buffs (research needed)
 *
 * Speed bonuses are MULTIPLICATIVE with time (reduce duration).
 * Efficiency bonuses are ADDITIVE with each other, then MULTIPLICATIVE with time.
 *
 * Formula: actionTime = baseTime / (1 + totalEfficiency + totalSpeed)
 */

/**
 * Map action type HRID to equipment speed field name
 * @param {string} actionTypeHrid - Action type HRID (e.g., "/action_types/cheesesmithing")
 * @returns {string|null} Speed field name (e.g., "cheesesmithingSpeed") or null
 */
function getSpeedFieldForActionType(actionTypeHrid) {
    // Extract skill name from action type HRID
    // e.g., "/action_types/cheesesmithing" -> "cheesesmithing"
    const skillName = actionTypeHrid.replace('/action_types/', '');

    // Map to speed field name
    // e.g., "cheesesmithing" -> "cheesesmithingSpeed"
    const speedField = skillName + 'Speed';

    // Valid speed fields from game data
    const validSpeedFields = [
        'milkingSpeed',
        'foragingSpeed',
        'woodcuttingSpeed',
        'cheesesmithingSpeed',
        'craftingSpeed',
        'tailoringSpeed',
        'brewingSpeed',
        'cookingSpeed'
    ];

    return validSpeedFields.includes(speedField) ? speedField : null;
}

/**
 * Calculate enhancement scaling for speed bonuses
 * Each enhancement level adds +0.1 to the base speed bonus
 * @param {number} baseSpeed - Base speed bonus from item (e.g., 0.15 for 15%)
 * @param {number} enhancementLevel - Enhancement level (0-5)
 * @returns {number} Scaled speed bonus
 *
 * @example
 * calculateEnhancementScaling(0.15, 0) // 0.15 (15%)
 * calculateEnhancementScaling(0.15, 2) // 0.35 (35%)
 */
function calculateEnhancementScaling(baseSpeed, enhancementLevel) {
    // Each enhancement level adds 0.1 (10%) to the base
    return baseSpeed + (enhancementLevel * 0.1);
}

/**
 * Parse equipment speed bonuses for a specific action type
 * @param {Map} characterEquipment - Equipment map from dataManager.getEquipment()
 * @param {string} actionTypeHrid - Action type HRID
 * @param {Object} itemDetailMap - Item details from init_client_data
 * @returns {number} Total speed bonus as decimal (e.g., 0.15 for 15%)
 *
 * @example
 * parseEquipmentSpeedBonuses(equipment, "/action_types/cheesesmithing", items)
 * // Returns: 0.15 (if wearing Cheese Chisel +0)
 * // Returns: 0.35 (if wearing Cheese Chisel +2)
 * // Returns: 0.50 (if wearing two items with 15% and 35% bonuses)
 */
export function parseEquipmentSpeedBonuses(characterEquipment, actionTypeHrid, itemDetailMap) {
    if (!characterEquipment || characterEquipment.size === 0) {
        return 0; // No equipment
    }

    if (!actionTypeHrid || !itemDetailMap) {
        return 0; // Missing required data
    }

    // Get the speed field for this action type
    const speedField = getSpeedFieldForActionType(actionTypeHrid);

    if (!speedField) {
        // No speed bonuses for this action type
        return 0;
    }

    let totalSpeedBonus = 0;

    // Iterate through all equipped items
    for (const [slotHrid, equippedItem] of characterEquipment) {
        // Get item details from game data
        const itemDetails = itemDetailMap[equippedItem.itemHrid];

        if (!itemDetails || !itemDetails.equipmentDetail) {
            continue; // Not an equipment item
        }

        // Check if item has noncombat stats
        const noncombatStats = itemDetails.equipmentDetail.noncombatStats;

        if (!noncombatStats) {
            continue; // No noncombat stats
        }

        // Check if item has the speed bonus for this action type
        const baseSpeed = noncombatStats[speedField];

        if (!baseSpeed || baseSpeed <= 0) {
            continue; // No speed bonus for this skill
        }

        // Get enhancement level from equipped item
        const enhancementLevel = equippedItem.enhancementLevel || 0;

        // Calculate scaled speed bonus
        const scaledSpeed = calculateEnhancementScaling(baseSpeed, enhancementLevel);

        // Add to total
        totalSpeedBonus += scaledSpeed;
    }

    return totalSpeedBonus;
}

/**
 * Get all speed bonuses for debugging
 * @param {Map} characterEquipment - Equipment map
 * @param {Object} itemDetailMap - Item details
 * @returns {Array} Array of speed bonus objects
 */
export function debugEquipmentSpeedBonuses(characterEquipment, itemDetailMap) {
    if (!characterEquipment || characterEquipment.size === 0) {
        return [];
    }

    const bonuses = [];

    for (const [slotHrid, equippedItem] of characterEquipment) {
        const itemDetails = itemDetailMap[equippedItem.itemHrid];

        if (!itemDetails || !itemDetails.equipmentDetail) {
            continue;
        }

        const noncombatStats = itemDetails.equipmentDetail.noncombatStats;

        if (!noncombatStats) {
            continue;
        }

        // Find all speed bonuses on this item
        for (const [statName, value] of Object.entries(noncombatStats)) {
            if (statName.endsWith('Speed') && value > 0) {
                const enhancementLevel = equippedItem.enhancementLevel || 0;
                const scaledValue = calculateEnhancementScaling(value, enhancementLevel);

                bonuses.push({
                    itemName: itemDetails.name,
                    itemHrid: equippedItem.itemHrid,
                    slot: slotHrid,
                    speedType: statName,
                    baseBonus: value,
                    enhancementLevel,
                    scaledBonus: scaledValue
                });
            }
        }
    }

    return bonuses;
}
