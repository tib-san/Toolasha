// Quick debug script to check actual enhancement params
// Paste this into console after MWI Tools has loaded

console.log('=== Enhancement Params Check ===');

const MWITools = window.MWITools;

if (!MWITools) {
    console.error('MWI Tools not loaded yet!');
} else {
    // Get the actual params from the config function
    const params = MWITools.getEnhancingParams();

    console.log('Auto-detected params:');
    console.log('  Base Enhancing Level:', params.enhancingLevel - (params.detectedTeaBonus || 0));
    console.log('  Tea Level Bonus:', params.detectedTeaBonus || 0);
    console.log('  Effective Enhancing Level:', params.enhancingLevel);
    console.log('');
    console.log('  Equipment Success:', params.equipmentSuccessBonus?.toFixed(2) + '%');
    console.log('  House Success (Observatory):', params.houseSuccessBonus?.toFixed(2) + '%');
    console.log('  Total Success (toolBonus):', params.toolBonus.toFixed(2) + '%');
    console.log('');
    console.log('  Drink Concentration:', params.drinkConcentration?.toFixed(2) + '%');
    console.log('  Guzzling Bonus:', params.guzzlingBonus?.toFixed(4));
    console.log('');
    console.log('  Blessed Tea:', params.teas?.blessed ? 'Yes' : 'No');
    console.log('');

    // Test calculation with item level 90
    const itemLevel = 90;
    const levelAdvantage = 0.05 * (params.enhancingLevel - itemLevel);
    const successMultiplier = 1 + (params.toolBonus + levelAdvantage) / 100;

    console.log('Calculated for Item Level 90:');
    console.log('  Level Advantage:', levelAdvantage.toFixed(2) + '%');
    console.log('  Success Multiplier:', successMultiplier.toFixed(4));
    console.log('  Expected: 1.0519');
    console.log('');

    if (Math.abs(successMultiplier - 1.0519) > 0.001) {
        console.log('⚠️ MISMATCH DETECTED');
        console.log('Difference:', (successMultiplier - 1.0519).toFixed(4));
        console.log('');
        console.log('Expected breakdown:');
        console.log('  Equipment: 4.20%');
        console.log('  House: 0.05%');
        console.log('  Total toolBonus: 4.25%');
        console.log('  Level Advantage: 0.94%');
        console.log('  = 1 + (4.25 + 0.94) / 100 = 1.0519');
    } else {
        console.log('✅ Success multiplier matches expected value!');
    }

    // Show detected equipment
    console.log('');
    console.log('Detected Equipment:');
    if (params.toolSlot) console.log('  Tool:', params.toolSlot.name, params.toolSlot.enhancementLevel > 0 ? `+${params.toolSlot.enhancementLevel}` : '');
    if (params.bodySlot) console.log('  Body:', params.bodySlot.name, params.bodySlot.enhancementLevel > 0 ? `+${params.bodySlot.enhancementLevel}` : '');
    if (params.legsSlot) console.log('  Legs:', params.legsSlot.name, params.legsSlot.enhancementLevel > 0 ? `+${params.legsSlot.enhancementLevel}` : '');
    if (params.handsSlot) console.log('  Hands:', params.handsSlot.name, params.handsSlot.enhancementLevel > 0 ? `+${params.handsSlot.enhancementLevel}` : '');
}
