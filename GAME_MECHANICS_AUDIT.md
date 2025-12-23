# Game Mechanics Audit System

## Problem Statement

During development of calculators and detection systems, we systematically missed **secondary effects** on game mechanics across ALL skills, not just enhancing.

### Issues Discovered

1. **House Rooms:**
   - ✅ Skill-specific buffs (detected)
   - ❌ Global buffs (wisdom, rare find) - easily overlooked
   - Pattern: ALL rooms have BOTH actionBuffs + globalBuffs

2. **Skill Teas:**
   - ✅ Level Bonus (detected)
   - ❌ Secondary buff (MISSED initially)
   - Pattern: Enhancing uses action_speed, all others use efficiency

3. **Community Buffs:**
   - ❌ Entire system missed initially
   - Pattern: 5 buff types affect all players globally

4. **Equipment Stats:**
   - Pattern: Each skill has 4 stat types (success, speed, rareFind, experience)
   - Risk: Missing one or more stat types per skill

### Root Cause

**Pattern:** When implementing game mechanic detection, we focused on the obvious/documented effect and overlooked secondary effects in the data structures.

**Data Structure Patterns We Missed:**
- consumableDetail.buffs (plural) → array of multiple effects
- House rooms: actionBuffs + globalBuffs → two separate arrays
- Equipment: multiple *Success, *Speed, *RareFind, *Experience fields
- Tea effects scale with drinkConcentration

---

## Solution: Automated Validation System

### Architecture

**File:** `/Users/kennydean/Downloads/MWI/MWI Tools/src/utils/game-mechanics-audit.js`

**Purpose:** Systematically validate that ALL expected effects from game mechanics are being detected and processed across ALL skills.

### Features

1. **Comprehensive Expected Effect Definitions:**
   - **House rooms (17 total)**: actionBuffs + globalBuffs for each room
   - **Skill teas (27 teas)**: 9 skills × 3 tiers (regular, super, ultra)
   - **Special teas (8 teas)**: Blessed, Efficiency, Artisan, Catalytic, Gourmet, Processing, Gathering, Wisdom
   - **Equipment stats**: 4 stat types × 10 skills = 40 stat fields
   - **Community buffs (5 types)**: All enhancing-related global buffs

2. **Automatic Validation:**
   - Runs on page load (integrated into main.js)
   - Compares expected effects vs actual game data
   - Warns about missing effects in console
   - Reports successful detections (limited to avoid spam)

3. **Manual Testing:**
   - Exposed via MWITools debug object
   - Can be run anytime in console
   - Detailed audit results with warnings and info

---

## Critical Discovery: Skill Tea Patterns

During generalization, we discovered a **key distinction** in how teas work:

### Enhancing Teas (Special Case)
```javascript
'/items/enhancing_tea': [
    '/buff_types/enhancing_level',  // +3 levels
    '/buff_types/action_speed',     // +2% action speed
]
```

### All Other Skill Teas (Standard Pattern)
```javascript
'/items/foraging_tea': [
    '/buff_types/foraging_level',  // +3 levels
    '/buff_types/efficiency',      // +2% efficiency
]

// Same for: milking, woodcutting, cheesesmithing, crafting,
// tailoring, brewing, cooking, alchemy
```

**Why the difference?**
- **Enhancing** doesn't use Efficiency mechanic (no repeated actions)
- **All other skills** use Efficiency (can repeat actions for free)

This is a **critical distinction** that affects how we calculate time/cost for each skill!

---

## Usage

### Automatic (On Page Load)

The audit runs automatically when MWI Tools initializes:

```
[MWI Tools] 🔍 Running Game Mechanics Audit...

[MWI Tools] === HOUSEROOMS ===
[MWI Tools] ℹ️ Observatory (Enhancing): All expected actionBuffs found (2 buffs)
[MWI Tools] ℹ️ Laboratory (Alchemy): All expected actionBuffs found (1 buffs)
[MWI Tools] ℹ️ Forge (Cheesesmithing): All expected actionBuffs found (1 buffs)
[MWI Tools] ℹ️ ... and 14 more

[MWI Tools] === SKILLTEAS ===
[MWI Tools] ℹ️ Enhancing Tea: All expected buffs found (2 buffs)
[MWI Tools] ℹ️ Super Enhancing Tea: All expected buffs found (2 buffs)
[MWI Tools] ℹ️ Ultra Enhancing Tea: All expected buffs found (2 buffs)
[MWI Tools] ℹ️ Foraging Tea: All expected buffs found (2 buffs)
[MWI Tools] ℹ️ Super Foraging Tea: All expected buffs found (2 buffs)
[MWI Tools] ℹ️ ... and 22 more

[MWI Tools] === SPECIALTEAS ===
[MWI Tools] ℹ️ Blessed Tea: All expected buffs found
[MWI Tools] ℹ️ Efficiency Tea: All expected buffs found
[MWI Tools] ℹ️ ... and 6 more

[MWI Tools] === EQUIPMENT ===
[MWI Tools] ℹ️ Found 245 items with noncombat stats
[MWI Tools] ℹ️ enhancing: Found 4/4 stat types
[MWI Tools] ℹ️ foraging: Found 4/4 stat types
[MWI Tools] ℹ️ ... and 8 more

[MWI Tools] === COMMUNITYBUFFS ===
[MWI Tools] ℹ️ Combat Drop Quantity: Found in game data
[MWI Tools] ℹ️ Enhancing Speed: Found in game data
[MWI Tools] ℹ️ ... and 3 more

[MWI Tools] ✅ Audit complete: No issues found!
```

### Manual (Console Command)

Run the audit manually anytime:

```javascript
// Full audit with all categories
MWITools.gameMechanicsAudit.runFullAudit(MWITools.dataManager.getInitClientData())

// Individual category audits
const gameData = MWITools.dataManager.getInitClientData();
MWITools.gameMechanicsAudit.auditHouseRoomBuffs(gameData)
MWITools.gameMechanicsAudit.auditSkillTeaBuffs(gameData)
MWITools.gameMechanicsAudit.auditSpecialTeaBuffs(gameData)
MWITools.gameMechanicsAudit.auditEquipmentStats(gameData)
MWITools.gameMechanicsAudit.auditCommunityBuffs(gameData)
```

---

## Expected Effects Reference

### House Rooms

**Pattern:** ALL rooms have actionBuffs (skill-specific) + globalBuffs (universal)

```javascript
// Example: Observatory (Enhancing)
actionBuffs: [
    '/buff_types/action_speed',        // +1% per level
    '/buff_types/enhancing_success',   // +0.05% per level
]

globalBuffs: [
    '/buff_types/wisdom',      // +0.05% per level (all rooms)
    '/buff_types/rare_find',   // +0.2% per level (all rooms)
]
```

**Data Location:** `gameData.houseRoomDetailMap[roomHrid].actionBuffs` + `globalBuffs`

**Key Pattern:** Two separate arrays - must check BOTH!

---

### Skill Teas

**Enhancing Teas (Special):**
```javascript
'/items/enhancing_tea': [
    '/buff_types/enhancing_level',  // +3 levels
    '/buff_types/action_speed',     // +2% speed
]
// Super: +6 levels, +4% speed
// Ultra: +8 levels, +6% speed
```

**All Other Skill Teas (Standard):**
```javascript
'/items/foraging_tea': [
    '/buff_types/foraging_level',  // +3 levels
    '/buff_types/efficiency',      // +2% efficiency
]
// Super: +6 levels, +4% efficiency
// Ultra: +8 levels, +6% efficiency
```

**Data Location:** `gameData.itemDetailMap[teaHrid].consumableDetail.buffs`

**Key Pattern:**
- Field is `consumableDetail.buffs` (note the wrapper + plural!)
- Two buffs per tea (level + speed/efficiency)
- All effects scale with Drink Concentration from equipment

---

### Equipment Stats

**Pattern:** Each skill has 4 stat types

```javascript
// Enhancing
'enhancingSuccess', 'enhancingSpeed', 'enhancingRareFind', 'enhancingExperience'

// Foraging
'foragingSuccess', 'foragingSpeed', 'foragingRareFind', 'foragingExperience'

// Same pattern for all 10 non-combat skills
```

**Universal Stats:**
```javascript
'skillingSpeed',       // Applies to all non-combat skills
'drinkConcentration',  // Scales tea/coffee effects
```

**Data Location:** `gameData.itemDetailMap[itemHrid].equipmentDetail.noncombatStats`

**Key Pattern:** Multiple fields on same object - check ALL stat types!

---

### Community Buffs

```javascript
'/community_buff_types/combat_drop_quantity',    // 20% + 0.5% per level
'/community_buff_types/enhancing_speed',         // 20% + 0.5% per level
'/community_buff_types/experience',              // 20% + 0.5% per level (Wisdom)
'/community_buff_types/gathering_quantity',      // 20% + 0.5% per level
'/community_buff_types/production_efficiency',   // 14% + 0.3% per level
```

**Data Location:** `gameData.communityBuffTypeDetailMap`

**Formula:** Most use `basePercent + (level - 1) × perLevelPercent`

---

## Data Structure Patterns

### Pattern 1: Plural Arrays = Multiple Effects

```javascript
// ❌ WRONG: Reading singular field
const buff = item.buff;  // Misses other buffs!

// ✅ CORRECT: Reading plural array
const buffs = item.consumableDetail.buffs;  // Array of all buffs
buffs.forEach(buff => {
    // Process ALL buffs
});
```

### Pattern 2: Multiple Arrays on Same Object

```javascript
// ❌ WRONG: Only checking actionBuffs
const actionBuffs = room.actionBuffs;

// ✅ CORRECT: Checking BOTH arrays
const actionBuffs = room.actionBuffs;  // Skill-specific
const globalBuffs = room.globalBuffs;  // Universal
```

### Pattern 3: Multiple Fields on Same Object

```javascript
// ❌ WRONG: Only reading one stat type
const success = stats.foragingSuccess;

// ✅ CORRECT: Reading all stat types
const success = stats.foragingSuccess || 0;
const speed = stats.foragingSpeed || 0;
const rareFind = stats.foragingRareFind || 0;
const experience = stats.foragingExperience || 0;
```

### Pattern 4: Nested Structures

```javascript
// ❌ WRONG: Forgetting wrapper object
const buffs = item.buffs;  // Wrong path!

// ✅ CORRECT: Using full path
const buffs = item.consumableDetail.buffs;  // Correct path
```

### Pattern 5: Scaling Factors

```javascript
// ❌ WRONG: Using base value directly
const teaEfficiency = 0.02;  // Base 2%

// ✅ CORRECT: Applying scaling factor
const drinkConcentration = 0.216;  // 21.6% from Guzzling Pouch
const scaledEfficiency = 0.02 * (1 + drinkConcentration);  // 2.43%
```

---

## Implementation Checklist

When implementing detection for game mechanics, use this checklist:

### 1. Data Structure Discovery
- [ ] Locate the data in `init_client_data_new.json`
- [ ] Check if field is an ARRAY (plural name is a hint)
- [ ] Check if object has MULTIPLE relevant arrays/fields
- [ ] Look for nested structures (consumableDetail, equipmentDetail, etc.)
- [ ] Look for scaling factors (concentration, level advantage, etc.)

### 2. Expected Effects Definition
- [ ] Add expected effects to `game-mechanics-audit.js`
- [ ] Document all buff types / stat fields / arrays
- [ ] Include formulas and scaling information
- [ ] Note any special cases (e.g., enhancing uses action_speed vs efficiency)

### 3. Detection Implementation
- [ ] Iterate ALL elements in arrays
- [ ] Read ALL relevant fields/arrays on objects
- [ ] Follow correct data path (don't forget wrapper objects)
- [ ] Apply scaling factors (don't forget!)
- [ ] Verify against game data

### 4. Validation
- [ ] Run audit to check for warnings
- [ ] Verify calculations match in-game values
- [ ] Test with different configurations

---

## Common Mistakes

### ❌ Don't Do This

```javascript
// 1. Reading wrong field path
const buffs = tea.buffs;  // WRONG: Missing consumableDetail wrapper

// 2. Only checking one array
const buffs = room.actionBuffs;  // WRONG: Missing globalBuffs

// 3. Only reading one stat type
const success = stats.foragingSuccess;  // WRONG: Missing other 3 stats

// 4. Forgetting to scale
const teaSpeed = 0.02;  // WRONG: Doesn't scale with concentration

// 5. Using wrong buff type
if (tea has action_speed) // WRONG: Most skills use efficiency!
```

### ✅ Do This Instead

```javascript
// 1. Use correct field path
const buffs = tea.consumableDetail.buffs;  // CORRECT

// 2. Check ALL arrays
const actionBuffs = room.actionBuffs;
const globalBuffs = room.globalBuffs;  // CORRECT: Both arrays

// 3. Read all stat types
const success = stats.foragingSuccess || 0;
const speed = stats.foragingSpeed || 0;
const rareFind = stats.foragingRareFind || 0;
const experience = stats.foragingExperience || 0;
// CORRECT: All 4 stats

// 4. Apply scaling factors
const scaled = baseSpeed * (1 + concentration);  // CORRECT

// 5. Know the difference
if (skill === 'enhancing') {
    // Use action_speed
} else {
    // Use efficiency
}  // CORRECT: Different buffs for different skills
```

---

## Benefits

1. **Prevents Systematic Bugs:** Catches missing effects across ALL skills
2. **Documentation:** Expected effects are clearly defined in code
3. **Confidence:** Audit confirms all effects are detected
4. **Debugging:** Easy to identify what's missing vs what's expected
5. **Maintenance:** Adding new mechanics follows clear pattern
6. **Coverage:** Validates equipment, consumables, house rooms, community buffs

---

## Future Improvements

Potential enhancements to the audit system:

1. **Automated Testing:** Run audit in CI/CD pipeline
2. **JSON Schema Validation:** Validate game data structure changes
3. **Diff Detection:** Alert when game data structure changes
4. **Coverage Reports:** Track which mechanics have validation
5. **Auto-fix Suggestions:** Propose code fixes for missing effects
6. **Combat Mechanics:** Extend to combat stats, abilities, triggers

---

## Conclusion

This audit system provides a **systematic solution** to prevent missing secondary effects across ALL game mechanics, not just enhancing. By clearly defining expected effects for all skills and validating against game data, we can confidently detect all mechanics without relying on manual testing alone.

**Key Takeaways:**
- When data structures have arrays or multiple fields, check ALL elements/fields
- Enhancing teas use action_speed, all others use efficiency
- House rooms have BOTH actionBuffs and globalBuffs
- Tea effects scale with Drink Concentration
- Equipment has 4 stat types per skill (success, speed, rareFind, experience)
- Community buffs affect all players globally
