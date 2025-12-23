/**
 * Game Mechanics Audit Module
 *
 * Systematically validates that all expected effects from game mechanics are being detected.
 * Covers ALL skills, not just enhancing.
 * Warns about missing effects to prevent systematic bugs where secondary effects are overlooked.
 */

/**
 * Expected buff types for house rooms
 * Each room has actionBuffs (skill-specific) + globalBuffs (wisdom, rare_find)
 */
const EXPECTED_HOUSE_BUFFS = {
    // Non-combat rooms
    '/house_rooms/observatory': {
        actionBuffs: ['/buff_types/action_speed', '/buff_types/enhancing_success'],
        skill: 'Enhancing'
    },
    '/house_rooms/laboratory': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Alchemy'
    },
    '/house_rooms/forge': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Cheesesmithing'
    },
    '/house_rooms/kitchen': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Cooking'
    },
    '/house_rooms/workshop': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Crafting'
    },
    '/house_rooms/sewing_parlor': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Tailoring'
    },
    '/house_rooms/brewery': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Brewing'
    },
    '/house_rooms/dairy_barn': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Milking'
    },
    '/house_rooms/garden': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Foraging'
    },
    '/house_rooms/log_shed': {
        actionBuffs: ['/buff_types/efficiency'],
        skill: 'Woodcutting'
    },
    // Combat rooms
    '/house_rooms/gym': {
        actionBuffs: ['/buff_types/max_hp'],
        skill: 'Stamina'
    },
    '/house_rooms/dojo': {
        actionBuffs: ['/buff_types/melee_accuracy'],
        skill: 'Melee'
    },
    '/house_rooms/archery_range': {
        actionBuffs: ['/buff_types/ranged_accuracy'],
        skill: 'Ranged'
    },
    '/house_rooms/mystical_study': {
        actionBuffs: ['/buff_types/magic_accuracy'],
        skill: 'Magic'
    },
    '/house_rooms/armory': {
        actionBuffs: ['/buff_types/armor'],
        skill: 'Defense'
    },
    '/house_rooms/dining_room': {
        actionBuffs: ['/buff_types/combat_hp_regeneration'],
        skill: 'Combat Support'
    },
    '/house_rooms/library': {
        actionBuffs: ['/buff_types/max_mp'],
        skill: 'Intelligence'
    },
};

/**
 * Expected global buffs that ALL house rooms should have
 */
const EXPECTED_GLOBAL_BUFFS = [
    '/buff_types/wisdom',      // +0.05% per level
    '/buff_types/rare_find',   // +0.2% per level
];

/**
 * Expected buff types for skill teas (9 non-combat skills)
 * Pattern: skill_level + (action_speed for enhancing, efficiency for all others)
 */
const EXPECTED_SKILL_TEAS = {
    // Enhancing is special: uses action_speed instead of efficiency
    enhancing: {
        '/items/enhancing_tea': ['/buff_types/enhancing_level', '/buff_types/action_speed'],
        '/items/super_enhancing_tea': ['/buff_types/enhancing_level', '/buff_types/action_speed'],
        '/items/ultra_enhancing_tea': ['/buff_types/enhancing_level', '/buff_types/action_speed'],
    },
    // All other skills use efficiency
    foraging: {
        '/items/foraging_tea': ['/buff_types/foraging_level', '/buff_types/efficiency'],
        '/items/super_foraging_tea': ['/buff_types/foraging_level', '/buff_types/efficiency'],
        '/items/ultra_foraging_tea': ['/buff_types/foraging_level', '/buff_types/efficiency'],
    },
    woodcutting: {
        '/items/woodcutting_tea': ['/buff_types/woodcutting_level', '/buff_types/efficiency'],
        '/items/super_woodcutting_tea': ['/buff_types/woodcutting_level', '/buff_types/efficiency'],
        '/items/ultra_woodcutting_tea': ['/buff_types/woodcutting_level', '/buff_types/efficiency'],
    },
    milking: {
        '/items/milking_tea': ['/buff_types/milking_level', '/buff_types/efficiency'],
        '/items/super_milking_tea': ['/buff_types/milking_level', '/buff_types/efficiency'],
        '/items/ultra_milking_tea': ['/buff_types/milking_level', '/buff_types/efficiency'],
    },
    cheesesmithing: {
        '/items/cheesesmithing_tea': ['/buff_types/cheesesmithing_level', '/buff_types/efficiency'],
        '/items/super_cheesesmithing_tea': ['/buff_types/cheesesmithing_level', '/buff_types/efficiency'],
        '/items/ultra_cheesesmithing_tea': ['/buff_types/cheesesmithing_level', '/buff_types/efficiency'],
    },
    crafting: {
        '/items/crafting_tea': ['/buff_types/crafting_level', '/buff_types/efficiency'],
        '/items/super_crafting_tea': ['/buff_types/crafting_level', '/buff_types/efficiency'],
        '/items/ultra_crafting_tea': ['/buff_types/crafting_level', '/buff_types/efficiency'],
    },
    tailoring: {
        '/items/tailoring_tea': ['/buff_types/tailoring_level', '/buff_types/efficiency'],
        '/items/super_tailoring_tea': ['/buff_types/tailoring_level', '/buff_types/efficiency'],
        '/items/ultra_tailoring_tea': ['/buff_types/tailoring_level', '/buff_types/efficiency'],
    },
    brewing: {
        '/items/brewing_tea': ['/buff_types/brewing_level', '/buff_types/efficiency'],
        '/items/super_brewing_tea': ['/buff_types/brewing_level', '/buff_types/efficiency'],
        '/items/ultra_brewing_tea': ['/buff_types/brewing_level', '/buff_types/efficiency'],
    },
    cooking: {
        '/items/cooking_tea': ['/buff_types/cooking_level', '/buff_types/efficiency'],
        '/items/super_cooking_tea': ['/buff_types/cooking_level', '/buff_types/efficiency'],
        '/items/ultra_cooking_tea': ['/buff_types/cooking_level', '/buff_types/efficiency'],
    },
    alchemy: {
        '/items/alchemy_tea': ['/buff_types/alchemy_level', '/buff_types/efficiency'],
        '/items/super_alchemy_tea': ['/buff_types/alchemy_level', '/buff_types/efficiency'],
        '/items/ultra_alchemy_tea': ['/buff_types/alchemy_level', '/buff_types/efficiency'],
    },
};

/**
 * Expected special teas (non-skill-specific)
 */
const EXPECTED_SPECIAL_TEAS = {
    '/items/blessed_tea': ['/buff_types/double_enhancement_jump'],
    '/items/efficiency_tea': ['/buff_types/efficiency'],
    '/items/artisan_tea': ['/buff_types/artisan', '/buff_types/artisan_level'],
    '/items/catalytic_tea': ['/buff_types/alchemy_success'],
    '/items/gourmet_tea': ['/buff_types/gourmet'],
    '/items/processing_tea': ['/buff_types/processing'],
    '/items/gathering_tea': ['/buff_types/gathering'],
    '/items/wisdom_tea': ['/buff_types/wisdom'],
};

/**
 * Expected noncombat stats for equipment by skill
 */
const EXPECTED_EQUIPMENT_STATS_BY_SKILL = {
    enhancing: ['enhancingSuccess', 'enhancingSpeed', 'enhancingRareFind', 'enhancingExperience'],
    foraging: ['foragingSuccess', 'foragingSpeed', 'foragingRareFind', 'foragingExperience'],
    woodcutting: ['woodcuttingSuccess', 'woodcuttingSpeed', 'woodcuttingRareFind', 'woodcuttingExperience'],
    milking: ['milkingSuccess', 'milkingSpeed', 'milkingRareFind', 'milkingExperience'],
    cheesesmithing: ['cheesesmithingSuccess', 'cheesesmithingSpeed', 'cheesesmithingRareFind', 'cheesesmithingExperience'],
    crafting: ['craftingSuccess', 'craftingSpeed', 'craftingRareFind', 'craftingExperience'],
    tailoring: ['tailoringSuccess', 'tailoringSpeed', 'tailoringRareFind', 'tailoringExperience'],
    brewing: ['brewingSuccess', 'brewingSpeed', 'brewingRareFind', 'brewingExperience'],
    cooking: ['cookingSuccess', 'cookingSpeed', 'cookingRareFind', 'cookingExperience'],
    alchemy: ['alchemySuccess', 'alchemySpeed', 'alchemyRareFind', 'alchemyExperience'],
    // Universal stats
    universal: ['skillingSpeed', 'drinkConcentration'],
};

/**
 * Expected community buff types
 */
const EXPECTED_COMMUNITY_BUFFS = [
    '/community_buff_types/combat_drop_quantity',
    '/community_buff_types/enhancing_speed',
    '/community_buff_types/experience',          // Wisdom
    '/community_buff_types/gathering_quantity',
    '/community_buff_types/production_efficiency',
];

/**
 * Audit house room buffs
 * @param {Object} gameData - Game data from init_client_data
 * @returns {Object} Audit results
 */
export function auditHouseRoomBuffs(gameData) {
    const results = {
        valid: true,
        warnings: [],
        info: []
    };

    if (!gameData?.houseRoomDetailMap) {
        results.valid = false;
        results.warnings.push('Game data missing houseRoomDetailMap');
        return results;
    }

    // Check each expected house room
    for (const [roomHrid, expectedData] of Object.entries(EXPECTED_HOUSE_BUFFS)) {
        const room = gameData.houseRoomDetailMap[roomHrid];

        if (!room) {
            results.warnings.push(`House room not found: ${roomHrid}`);
            continue;
        }

        // Check actionBuffs
        if (!room.actionBuffs || room.actionBuffs.length === 0) {
            results.valid = false;
            results.warnings.push(`${room.name}: Missing actionBuffs array`);
            continue;
        }

        const foundBuffTypes = room.actionBuffs.map(buff => buff.typeHrid);
        const missingBuffs = expectedData.actionBuffs.filter(expected => !foundBuffTypes.includes(expected));

        if (missingBuffs.length > 0) {
            results.valid = false;
            results.warnings.push(`${room.name}: Missing expected actionBuffs: ${missingBuffs.join(', ')}`);
        } else {
            results.info.push(`${room.name} (${expectedData.skill}): All expected actionBuffs found (${foundBuffTypes.length} buffs)`);
        }

        // Check globalBuffs
        if (!room.globalBuffs || room.globalBuffs.length === 0) {
            results.valid = false;
            results.warnings.push(`${room.name}: Missing globalBuffs array`);
        } else {
            const foundGlobalBuffs = room.globalBuffs.map(buff => buff.typeHrid);
            const missingGlobalBuffs = EXPECTED_GLOBAL_BUFFS.filter(expected => !foundGlobalBuffs.includes(expected));

            if (missingGlobalBuffs.length > 0) {
                results.valid = false;
                results.warnings.push(`${room.name}: Missing expected globalBuffs: ${missingGlobalBuffs.join(', ')}`);
            }
        }
    }

    return results;
}

/**
 * Audit skill tea buffs
 * @param {Object} gameData - Game data from init_client_data
 * @returns {Object} Audit results
 */
export function auditSkillTeaBuffs(gameData) {
    const results = {
        valid: true,
        warnings: [],
        info: []
    };

    if (!gameData?.itemDetailMap) {
        results.valid = false;
        results.warnings.push('Game data missing itemDetailMap');
        return results;
    }

    // Check each skill's teas
    for (const [skillName, teas] of Object.entries(EXPECTED_SKILL_TEAS)) {
        for (const [teaHrid, expectedBuffs] of Object.entries(teas)) {
            const tea = gameData.itemDetailMap[teaHrid];

            if (!tea) {
                results.warnings.push(`Tea not found: ${teaHrid}`);
                continue;
            }

            // Check for consumableDetail.buffs array
            if (!tea.consumableDetail?.buffs || !Array.isArray(tea.consumableDetail.buffs)) {
                results.valid = false;
                results.warnings.push(`${tea.name}: Missing consumableDetail.buffs ARRAY`);
                continue;
            }

            if (tea.consumableDetail.buffs.length === 0) {
                results.valid = false;
                results.warnings.push(`${tea.name}: consumableDetail.buffs array is empty`);
                continue;
            }

            // Get all buff types present
            const foundBuffTypes = tea.consumableDetail.buffs.map(buff => buff.typeHrid);

            // Check for missing expected buffs
            const missingBuffs = expectedBuffs.filter(expected => !foundBuffTypes.includes(expected));

            if (missingBuffs.length > 0) {
                results.valid = false;
                results.warnings.push(`${tea.name}: Missing expected buffs: ${missingBuffs.join(', ')}`);
            } else {
                results.info.push(`${tea.name}: All expected buffs found (${foundBuffTypes.length} buffs)`);
            }
        }
    }

    return results;
}

/**
 * Audit special tea buffs
 * @param {Object} gameData - Game data from init_client_data
 * @returns {Object} Audit results
 */
export function auditSpecialTeaBuffs(gameData) {
    const results = {
        valid: true,
        warnings: [],
        info: []
    };

    if (!gameData?.itemDetailMap) {
        results.valid = false;
        results.warnings.push('Game data missing itemDetailMap');
        return results;
    }

    for (const [teaHrid, expectedBuffs] of Object.entries(EXPECTED_SPECIAL_TEAS)) {
        const tea = gameData.itemDetailMap[teaHrid];

        if (!tea) {
            results.warnings.push(`Special tea not found: ${teaHrid}`);
            continue;
        }

        if (!tea.consumableDetail?.buffs) {
            results.valid = false;
            results.warnings.push(`${tea.name}: Missing consumableDetail.buffs`);
            continue;
        }

        const foundBuffTypes = tea.consumableDetail.buffs.map(buff => buff.typeHrid);
        const missingBuffs = expectedBuffs.filter(expected => !foundBuffTypes.includes(expected));

        if (missingBuffs.length > 0) {
            results.valid = false;
            results.warnings.push(`${tea.name}: Missing expected buffs: ${missingBuffs.join(', ')}`);
        } else {
            results.info.push(`${tea.name}: All expected buffs found`);
        }
    }

    return results;
}

/**
 * Audit equipment noncombat stats coverage
 * @param {Object} gameData - Game data from init_client_data
 * @returns {Object} Audit results
 */
export function auditEquipmentStats(gameData) {
    const results = {
        valid: true,
        warnings: [],
        info: [],
        statsBySkill: {}
    };

    if (!gameData?.itemDetailMap) {
        results.valid = false;
        results.warnings.push('Game data missing itemDetailMap');
        return results;
    }

    // Track which stats we've found for each skill
    for (const skill of Object.keys(EXPECTED_EQUIPMENT_STATS_BY_SKILL)) {
        results.statsBySkill[skill] = new Set();
    }

    // Scan all items for noncombat stats
    let itemsWithNoncombatStats = 0;

    for (const [itemHrid, item] of Object.entries(gameData.itemDetailMap)) {
        if (!item.equipmentDetail?.noncombatStats) continue;

        const stats = item.equipmentDetail.noncombatStats;
        itemsWithNoncombatStats++;

        // Track which stats we've found
        for (const [skill, expectedStats] of Object.entries(EXPECTED_EQUIPMENT_STATS_BY_SKILL)) {
            expectedStats.forEach(stat => {
                if (stats[stat] !== undefined) {
                    results.statsBySkill[skill].add(stat);
                }
            });
        }
    }

    results.info.push(`Found ${itemsWithNoncombatStats} items with noncombat stats`);

    // Check if we're missing any expected stat types for each skill
    for (const [skill, expectedStats] of Object.entries(EXPECTED_EQUIPMENT_STATS_BY_SKILL)) {
        const foundStats = Array.from(results.statsBySkill[skill]);
        const missingStats = expectedStats.filter(stat => !results.statsBySkill[skill].has(stat));

        if (foundStats.length > 0) {
            results.info.push(`${skill}: Found ${foundStats.length}/${expectedStats.length} stat types`);
        }

        if (missingStats.length > 0) {
            results.warnings.push(`${skill}: No items found with these stats: ${missingStats.join(', ')}`);
        }
    }

    return results;
}

/**
 * Audit community buff detection
 * @param {Object} gameData - Game data from init_client_data
 * @returns {Object} Audit results
 */
export function auditCommunityBuffs(gameData) {
    const results = {
        valid: true,
        warnings: [],
        info: []
    };

    if (!gameData?.communityBuffTypeDetailMap) {
        results.valid = false;
        results.warnings.push('Game data missing communityBuffTypeDetailMap');
        return results;
    }

    // Check for expected community buffs
    for (const buffHrid of EXPECTED_COMMUNITY_BUFFS) {
        const buff = gameData.communityBuffTypeDetailMap[buffHrid];

        if (!buff) {
            results.valid = false;
            results.warnings.push(`Community buff not found: ${buffHrid}`);
            continue;
        }

        results.info.push(`${buff.name}: Found in game data`);
    }

    return results;
}

/**
 * Run full game mechanics audit
 * @param {Object} gameData - Game data from init_client_data
 * @returns {Object} Complete audit results
 */
export function runFullAudit(gameData) {
    console.log('[MWI Tools] 🔍 Running Game Mechanics Audit...');

    const results = {
        houseRooms: auditHouseRoomBuffs(gameData),
        skillTeas: auditSkillTeaBuffs(gameData),
        specialTeas: auditSpecialTeaBuffs(gameData),
        equipment: auditEquipmentStats(gameData),
        communityBuffs: auditCommunityBuffs(gameData),
    };

    // Print results
    let hasWarnings = false;

    for (const [category, result] of Object.entries(results)) {
        console.log(`\n[MWI Tools] === ${category.toUpperCase()} ===`);

        if (result.warnings.length > 0) {
            hasWarnings = true;
            result.warnings.forEach(warning => {
                console.warn(`[MWI Tools] ⚠️ ${warning}`);
            });
        }

        if (result.info.length > 0) {
            // Only show first 5 info lines to avoid spam
            const infoToShow = result.info.slice(0, 5);
            infoToShow.forEach(info => {
                console.log(`[MWI Tools] ℹ️ ${info}`);
            });
            if (result.info.length > 5) {
                console.log(`[MWI Tools] ℹ️ ... and ${result.info.length - 5} more`);
            }
        }
    }

    if (!hasWarnings) {
        console.log('\n[MWI Tools] ✅ Audit complete: No issues found!');
    } else {
        console.log('\n[MWI Tools] ⚠️ Audit complete: Issues found (see warnings above)');
    }

    return results;
}

/**
 * Data structure patterns to watch for (documentation)
 */
export const DATA_PATTERNS = {
    MULTIPLE_EFFECTS: [
        '✓ consumableDetail.buffs (plural array) indicates multiple effects',
        '✓ House rooms have actionBuffs + globalBuffs (both arrays)',
        '✓ Equipment with multiple *Success, *Speed, *RareFind, *Experience fields',
        '✓ Community buffs all follow basePercent + perLevelPercent pattern',
    ],
    COMMON_MISTAKES: [
        '❌ Reading singular field instead of plural array (buff vs buffs)',
        '❌ Only checking first element of array',
        '❌ Forgetting consumableDetail wrapper on teas',
        '❌ Not checking both actionBuffs AND globalBuffs on house rooms',
        '❌ Not scaling tea effects with drinkConcentration',
        '❌ Confusing action_speed (enhancing) vs efficiency (other skills)',
    ],
    KEY_DISTINCTIONS: [
        '⚠️ Enhancing Teas: skill_level + action_speed',
        '⚠️ All Other Skill Teas: skill_level + efficiency',
        '⚠️ House Rooms: actionBuffs (skill-specific) + globalBuffs (universal)',
        '⚠️ Tea effects scale with Drink Concentration from equipment',
    ]
};
