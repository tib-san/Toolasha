/**
 * Debug Enhancement Speed Calculator
 *
 * Run in browser console to trace all sources of enhancing action speed
 * Usage: MWITools.debugEnhancementSpeed()
 */

export function debugEnhancementSpeed() {
    const gameData = window.localStorageUtil.getInitClientData();
    const character = window.localStorageUtil.getCharacter();

    console.log('=== ENHANCEMENT SPEED DEBUG ===\n');

    let totalSpeed = 0;
    const sources = [];

    // 1. EQUIPMENT
    console.log('📦 EQUIPMENT:');
    const equipment = character?.equipmentMap || {};
    const inventory = character?.itemMap || {};

    // Combine equipment map and inventory to scan ALL items
    const allItems = [
        ...Object.values(equipment),
        ...Object.values(inventory)
    ].filter(item => item && item.itemHrid);

    // Track best item per slot
    const slotCandidates = {
        tool: [],
        body: [],
        legs: [],
        hands: []
    };

    for (const item of allItems) {
        const itemDetails = gameData.itemDetailMap[item.itemHrid];
        if (!itemDetails?.equipmentDetail?.noncombatStats?.enhancingSpeed) continue;

        const enhancementLevel = item.enhancementLevel || 0;
        const equipmentType = itemDetails.equipmentDetail.type;

        // Calculate enhancement multiplier
        const slotMultipliers = {
            '/equipment_types/neck': 5,
            '/equipment_types/ring': 5,
            '/equipment_types/earring': 5,
            '/equipment_types/back': 5,
            '/equipment_types/trinket': 5,
            '/equipment_types/charm': 5,
        };
        const slotMultiplier = slotMultipliers[equipmentType] || 1;

        const enhancementBonuses = {
            1: 0.020, 2: 0.042, 3: 0.066, 4: 0.092, 5: 0.120,
            6: 0.150, 7: 0.182, 8: 0.216, 9: 0.252, 10: 0.290,
            11: 0.334, 12: 0.384, 13: 0.440, 14: 0.502, 15: 0.570,
            16: 0.644, 17: 0.724, 18: 0.810, 19: 0.902, 20: 1.000
        };
        const enhancementBonus = enhancementBonuses[enhancementLevel] || 0;
        const multiplier = 1 + (enhancementBonus * slotMultiplier);

        const baseSpeed = itemDetails.equipmentDetail.noncombatStats.enhancingSpeed * 100;
        const finalSpeed = baseSpeed * multiplier;

        const itemInfo = {
            item: item,
            itemDetails: itemDetails,
            itemLevel: itemDetails.itemLevel || 0,
            enhancementLevel: enhancementLevel,
            speedBonus: finalSpeed,
            equipmentType: equipmentType
        };

        // Group by slot
        if (equipmentType === '/equipment_types/enhancing_tool' ||
            equipmentType === '/equipment_types/main_hand' ||
            equipmentType === '/equipment_types/two_hand') {
            slotCandidates.tool.push(itemInfo);
        } else if (equipmentType === '/equipment_types/body') {
            slotCandidates.body.push(itemInfo);
        } else if (equipmentType === '/equipment_types/legs') {
            slotCandidates.legs.push(itemInfo);
        } else if (equipmentType === '/equipment_types/hands') {
            slotCandidates.hands.push(itemInfo);
        }
    }

    // Select best item per slot
    const selectBest = (candidates) => {
        if (candidates.length === 0) return null;
        return candidates.reduce((best, current) => {
            if (current.itemLevel > best.itemLevel) return current;
            if (current.itemLevel < best.itemLevel) return best;
            if (current.enhancementLevel > best.enhancementLevel) return current;
            return best;
        });
    };

    const bestTool = selectBest(slotCandidates.tool);
    const bestBody = selectBest(slotCandidates.body);
    const bestLegs = selectBest(slotCandidates.legs);
    const bestHands = selectBest(slotCandidates.hands);

    let equipmentSpeed = 0;

    if (bestTool) {
        console.log(`  Tool: ${bestTool.itemDetails.name} +${bestTool.enhancementLevel} → +${bestTool.speedBonus.toFixed(2)}%`);
        equipmentSpeed += bestTool.speedBonus;
        sources.push({name: `Equipment (Tool): ${bestTool.itemDetails.name}`, value: bestTool.speedBonus});
    }
    if (bestBody) {
        console.log(`  Body: ${bestBody.itemDetails.name} +${bestBody.enhancementLevel} → +${bestBody.speedBonus.toFixed(2)}%`);
        equipmentSpeed += bestBody.speedBonus;
        sources.push({name: `Equipment (Body): ${bestBody.itemDetails.name}`, value: bestBody.speedBonus});
    }
    if (bestLegs) {
        console.log(`  Legs: ${bestLegs.itemDetails.name} +${bestLegs.enhancementLevel} → +${bestLegs.speedBonus.toFixed(2)}%`);
        equipmentSpeed += bestLegs.speedBonus;
        sources.push({name: `Equipment (Legs): ${bestLegs.itemDetails.name}`, value: bestLegs.speedBonus});
    }
    if (bestHands) {
        console.log(`  Hands: ${bestHands.itemDetails.name} +${bestHands.enhancementLevel} → +${bestHands.speedBonus.toFixed(2)}%`);
        equipmentSpeed += bestHands.speedBonus;
        sources.push({name: `Equipment (Hands): ${bestHands.itemDetails.name}`, value: bestHands.speedBonus});
    }

    totalSpeed += equipmentSpeed;
    console.log(`  Total Equipment: +${equipmentSpeed.toFixed(2)}%\n`);

    // 2. HOUSE ROOM (Observatory)
    console.log('🏠 HOUSE ROOM:');
    const houseRoomLevels = character?.houseRoomLevelMap || {};
    const observatoryLevel = houseRoomLevels['/house_rooms/observatory'] || 0;
    const houseSpeed = observatoryLevel * 1.0; // 1% per level
    console.log(`  Observatory Level ${observatoryLevel} → +${houseSpeed.toFixed(2)}%`);
    totalSpeed += houseSpeed;
    sources.push({name: 'Observatory', value: houseSpeed});
    console.log('');

    // 3. COMMUNITY BUFF
    console.log('🌍 COMMUNITY BUFF:');
    const communityBuffs = character?.communityBuffMap || {};
    const enhancingSpeedLevel = communityBuffs['/community_buff_types/enhancing_speed']?.level || 0;
    const communitySpeed = enhancingSpeedLevel > 0 ? 20 + (enhancingSpeedLevel - 1) * 0.5 : 0;
    console.log(`  Enhancing Speed T${enhancingSpeedLevel} → +${communitySpeed.toFixed(2)}%`);
    totalSpeed += communitySpeed;
    sources.push({name: 'Community Buff', value: communitySpeed});
    console.log('');

    // 4. CONSUMABLES (Teas)
    console.log('☕ CONSUMABLES:');
    const actionQueue = character?.actionQueue || [];
    let drinkConcentration = 0;

    // Detect drink concentration from equipment
    for (const item of allItems) {
        const itemDetails = gameData.itemDetailMap[item.itemHrid];
        if (!itemDetails?.equipmentDetail?.noncombatStats?.drinkConcentration) continue;
        drinkConcentration += itemDetails.equipmentDetail.noncombatStats.drinkConcentration * 100;
    }
    console.log(`  Drink Concentration: ${drinkConcentration.toFixed(2)}%`);

    // Check active enhancing action for drink slots
    const enhancingAction = actionQueue.find(action =>
        gameData.actionDetailMap[action.actionHrid]?.type === '/action_types/enhancing'
    );

    if (enhancingAction?.drinkSlots) {
        for (const drink of enhancingAction.drinkSlots) {
            if (!drink?.itemHrid) continue;

            const drinkDetails = gameData.itemDetailMap[drink.itemHrid];
            if (!drinkDetails?.consumableDetail?.buffs) continue;

            // Check for action_speed buff
            const actionSpeedBuff = drinkDetails.consumableDetail.buffs.find(
                buff => buff.typeHrid === '/buff_types/action_speed'
            );

            if (actionSpeedBuff) {
                const baseSpeed = actionSpeedBuff.flatBoost * 100;
                const scaledSpeed = baseSpeed * (1 + drinkConcentration / 100);
                console.log(`  ${drinkDetails.name}: ${baseSpeed}% × ${(1 + drinkConcentration / 100).toFixed(4)} = +${scaledSpeed.toFixed(2)}%`);
                totalSpeed += scaledSpeed;
                sources.push({name: drinkDetails.name, value: scaledSpeed});
            }
        }
    } else {
        console.log('  No active enhancing action found');
    }
    console.log('');

    // 5. LEVEL ADVANTAGE
    console.log('⬆️ LEVEL ADVANTAGE:');
    const skills = character?.skills || [];
    const enhancingSkill = skills.find(s => s.skillHrid === '/skills/enhancing');
    let enhancingLevel = enhancingSkill?.level || 1;

    // Add tea level bonus
    if (enhancingAction?.drinkSlots) {
        for (const drink of enhancingAction.drinkSlots) {
            if (!drink?.itemHrid) continue;

            const drinkDetails = gameData.itemDetailMap[drink.itemHrid];
            if (!drinkDetails?.consumableDetail?.buffs) continue;

            const levelBuff = drinkDetails.consumableDetail.buffs.find(
                buff => buff.typeHrid === '/buff_types/enhancing_level'
            );

            if (levelBuff) {
                const levelBonus = levelBuff.flatBoost;
                console.log(`  ${drinkDetails.name} Level Bonus: +${levelBonus}`);
                enhancingLevel += levelBonus;
            }
        }
    }

    // Get item level from current action
    let itemLevel = 0;
    if (enhancingAction?.enhancingItemHrid) {
        const itemDetails = gameData.itemDetailMap[enhancingAction.enhancingItemHrid];
        itemLevel = itemDetails?.itemLevel || 0;
        console.log(`  Enhancing Level: ${enhancingLevel} (includes tea bonus)`);
        console.log(`  Item Level: ${itemLevel}`);

        if (enhancingLevel > itemLevel) {
            const levelAdvantage = enhancingLevel - itemLevel;
            console.log(`  Level Advantage: +${levelAdvantage.toFixed(2)}%`);
            totalSpeed += levelAdvantage;
            sources.push({name: 'Level Advantage', value: levelAdvantage});
        } else {
            console.log(`  Level Advantage: 0% (level ${enhancingLevel} ≤ item level ${itemLevel})`);
        }
    } else {
        console.log('  No item being enhanced currently');
    }
    console.log('');

    // SUMMARY
    console.log('📊 SUMMARY:');
    console.log(`  Total Action Speed: +${totalSpeed.toFixed(2)}%`);
    console.log('');
    console.log('Breakdown:');
    sources.forEach(source => {
        console.log(`  ${source.name}: +${source.value.toFixed(2)}%`);
    });

    return {
        totalSpeed,
        sources,
        equipment: { bestTool, bestBody, bestLegs, bestHands },
        houseLevel: observatoryLevel,
        communityBuffLevel: enhancingSpeedLevel,
        enhancingLevel,
        itemLevel
    };
}
