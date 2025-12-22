### 9. Equipment Speed Bonuses
**Setup:** Equip production equipment with speed bonuses (e.g., Cheese Pot for Brewing)

Run in console to check detection:
```javascript
const initData = MWITools.dataManager.getInitClientData();
const equipment = MWITools.dataManager.getEquipment();

// Check if we detect your brewing equipment
for (const [slot, item] of equipment) {
    const details = initData.itemDetailMap[item.itemHrid];
    if (details?.equipmentDetail?.noncombatStats?.brewingSpeed) {
        console.log(`${details.name} +${item.enhancementLevel}: ${details.equipmentDetail.noncombatStats.brewingSpeed * 100}% speed`);
    }
}
```
- [ ] Equipment speed detected correctly
- [ ] Enhancement level affects speed bonus

**Test in tooltip:**
- [ ] Hover over a Brewing item (e.g., tea)
- [ ] Check Action Time breakdown shows Equipment Speed step
- [ ] Verify speed bonus percentage matches your gear

### 10. Equipment Efficiency Bonuses
**Setup:** Equip production equipment with efficiency bonuses

Run console check:
```javascript
const initData = MWITools.dataManager.getInitClientData();
const equipment = MWITools.dataManager.getEquipment();

// Check efficiency gear
for (const [slot, item] of equipment) {
    const details = initData.itemDetailMap[item.itemHrid];
    const stats = details?.equipmentDetail?.noncombatStats;
    if (stats?.brewingEfficiency || stats?.skillingEfficiency) {
        console.log(`${details.name}: brewing=${stats.brewingEfficiency || 0}, skilling=${stats.skillingEfficiency || 0}`);
    }
}
```
- [ ] Equipment efficiency detected
- [ ] Enhancement scaling works

**Test in tooltip:**
- [ ] Hover over craftable item
- [ ] Check Efficiency section shows Equipment efficiency line
- [ ] Verify percentage matches your gear total

---

## House Room Testing

### 11. House Room Efficiency
Run in console:
```javascript
// Check your house rooms
const rooms = MWITools.dataManager.getHouseRooms();
for (const [hrid, room] of rooms) {
    console.log(`${hrid}: Level ${room.level} (+${room.level * 1.5}% efficiency)`);
}
```
- [ ] House rooms detected with correct levels
- [ ] Efficiency calculation: level × 1.5%

**Test in tooltip:**
- [ ] Hover over item from skill with house room (e.g., Brewing → Brewery)
- [ ] Check Efficiency section shows House Room line
- [ ] Verify percentage = room level × 1.5%

---

## Tea Buff Testing

### 12. Tea Detection - Basic
**Setup:** Equip teas to any skill slot

Run in console:
```javascript
// Check active drinks
const drinks = MWITools.dataManager.getActionDrinkSlots('/action_types/brewing');
console.log('Active drinks:', drinks);

drinks.forEach(drink => {
    const details = MWITools.dataManager.getItemDetails(drink.itemHrid);
    console.log(`${details.name}:`, details.consumableDetail?.buffs);
});
```
- [ ] Active drinks detected
- [ ] Buff types shown (efficiency, artisan, gourmet, etc.)

### 13. Drink Concentration
**Setup:** Equip items with Drink Concentration stat

Run in console:
```javascript
const initData = MWITools.dataManager.getInitClientData();
const equipment = MWITools.dataManager.getEquipment();

let totalDC = 0;
for (const [slot, item] of equipment) {
    const details = initData.itemDetailMap[item.itemHrid];
    const dc = details?.equipmentDetail?.noncombatStats?.drinkConcentration;
    if (dc) {
        const enh = item.enhancementLevel || 0;
        const bonus = details.equipmentDetail.noncombatEnhancementBonuses?.drinkConcentration || 0;
        const scaled = dc + (bonus * enh);
        console.log(`${details.name} +${enh}: ${(scaled * 100).toFixed(1)}%`);
        totalDC += scaled;
    }
}
console.log(`Total Drink Concentration: ${(totalDC * 100).toFixed(1)}%`);
```
- [ ] Drink Concentration detected
- [ ] Enhancement scaling applied
- [ ] Total matches expectations

### 14. Tea Efficiency Bonus
**Setup:** Equip Efficiency Tea or skill-specific tea (e.g., Brewing Tea)

**Test in tooltip:**
- [ ] Hover over craftable item
- [ ] Check Efficiency section shows Tea Buffs line
- [ ] Verify percentage is scaled by Drink Concentration
- [ ] Formula: base × (1 + DC) = displayed value

### 15. Artisan Tea Testing
**Setup:** Equip Artisan Tea (10% material reduction, +5 Action Level)

**Test Material Reduction:**
- [ ] Hover over item with 10+ material cost
- [ ] Verify header: `Artisan: -X% material requirement`
- [ ] Check material line shows breakdown:
  - Amount: `8.88 (10 base, -1.12 avg)`
  - Guaranteed savings line: `Guaranteed savings: 1 Milk`
  - Chance line: `12.0% chance to save 2 total`

**Test Action Level Bonus:**
- [ ] Check Efficiency > Level Advantage section
- [ ] Should show sub-line: `Effective Requirement: 55.0 (base 50 + 5.0 from tea)`
- [ ] Verify level advantage decreased by 5

### 16. Gourmet Tea Testing
**Setup:** Equip Gourmet Tea (12% bonus items for Brewing/Cooking)

**Test in tooltip:**
- [ ] Hover over Brewing or Cooking item
- [ ] Check for Gourmet section after Efficiency
- [ ] Verify shows: `Gourmet: +X% bonus items`
- [ ] Check Extra items line: `Extra: +X/hr`
- [ ] Check Total line: `Total: X/hr` (includes Gourmet bonus)

### 17. Processing Tea Testing
**Setup:** Equip Processing Tea (15% conversion for Milking/Foraging/Woodcutting)

**Test in tooltip:**
- [ ] Hover over gathering item (Milk, Log, Cotton)
- [ ] Check for Processing section
- [ ] Verify shows: `Processing: X% conversion chance`
- [ ] Check description: `Converts raw → processed materials`

---

## Pricing Mode Testing

### 18. Conservative Mode (Ask/Bid)
Run in console:
```javascript
MWITools.config.setSettingValue('profitCalc_pricingMode', 'conservative');
console.log('Mode:', MWITools.config.getSettingValue('profitCalc_pricingMode'));
```
- [ ] Hover over craftable item
- [ ] Check PRODUCTION COST uses Ask prices (higher)
- [ ] Check PROFIT ANALYSIS Sell price uses Bid (lower)
- [ ] Profit should be lowest of three modes

### 19. Hybrid Mode (Ask/Ask) - DEFAULT
Run in console:
```javascript
MWITools.config.setSettingValue('profitCalc_pricingMode', 'hybrid');
```
- [ ] Hover over craftable item
- [ ] Check PRODUCTION COST uses Ask prices
- [ ] Check PROFIT ANALYSIS Sell price uses Ask (higher)
- [ ] Profit should be middle of three modes

### 20. Optimistic Mode (Bid/Ask)
Run in console:
```javascript
MWITools.config.setSettingValue('profitCalc_pricingMode', 'optimistic');
```
- [ ] Hover over craftable item
- [ ] Check PRODUCTION COST uses Bid prices (lower)
- [ ] Check PROFIT ANALYSIS Sell price uses Ask
- [ ] Profit should be highest of three modes

---

## Edge Cases & Error Handling

### 21. Items Without Market Data
- [ ] Hover over untradeable item (e.g., quest item)
- [ ] Verify no price line appears (graceful handling)
- [ ] No console errors

### 22. Items Without Recipes
- [ ] Hover over raw material (e.g., Log)
- [ ] Verify price line shows
- [ ] Verify no profit section (not craftable)
- [ ] No console errors

### 23. Network Error Handling
Run in console:
```javascript
// Check for old/stale market data
const age = MWITools.marketAPI.getDataAge();
console.log(`Market data age: ${age ? Math.round(age / 1000 / 60) + ' minutes' : 'not loaded'}`);
```
- [ ] Market data has timestamp
- [ ] If > 60 minutes old, script should auto-refresh on next page load

---

## Performance Testing

### 24. Tooltip Responsiveness
- [ ] Rapidly hover over 10+ items in succession
- [ ] Tooltips should appear within 200ms
- [ ] No lag or freezing
- [ ] No console errors

### 25. Memory Usage
- [ ] Open Chrome Task Manager (Shift+Esc)
- [ ] Check MilkyWayIdle tab memory usage
- [ ] Should be < 200MB with script active
- [ ] Refresh page, memory should reset

---

## Bug Documentation

If you find any issues during testing, document here:

### Issue Template
```
**Issue #X: [Brief Description]**
- Feature: [which feature/module]
- Steps to Reproduce:
  1.
  2.
  3.
- Expected:
- Actual:
- Console Errors: [paste any errors]
- Screenshot: [if applicable]
```

---

## Testing Summary

**Date Tested:** _____________

**Total Tests:** 25 sections

**Passed:** ___ / 25

**Failed:** ___ / 25

**Critical Issues Found:** ___

**Minor Issues Found:** ___

**Ready for Settings UI:** ☐ Yes  ☐ No (document blockers above)

---

## Next Steps After Testing

Once testing is complete and issues are resolved:

1. **Build Settings UI** (ThirdPartyLinks sidebar)
   - Toggle switches for boolean settings
   - Dropdown for pricing mode
   - Reset to defaults button

2. **Implement remaining features** incrementally:
   - Action time displays
   - Networth calculator
   - Inventory sorting
   - Combat features
   - etc.

3. **Documentation updates:**
   - User guide for new features
   - Settings explanations
   - Known limitations
