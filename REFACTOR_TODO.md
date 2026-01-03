# Toolasha Refactoring TODO

## Priority 3: Reduce MutationObserver Usage (Performance Optimization)

### Current State
8 files create their own MutationObservers, all watching document.body simultaneously:

1. **settings-ui.js** - Own observer for settings panel mutations
2. **enhancement-ui.js** - Own observer for enhancement UI
3. **combat-score.js:353** - Cleanup observer (removes panel when modal closes)
4. **action-time-display.js:84** - Queue menu observer (watches for reordering)
5. **panel-observer.js** - Action panel observer
6. **quick-input-buttons.js:59** - Action panel observer
7. **house-panel-observer.js** - House panel observer

### Problem
- Multiple observers fire on **every DOM mutation**
- Redundant work checking the same nodes
- Performance overhead scales with number of observers

### Solution Strategy
**Centralized System Exists:** `core/dom-observer.js` provides:
- `domObserver.register(name, callback, options)` - Global observer
- `domObserver.onClass(name, className, callback)` - Class-specific watching
- Debouncing support to reduce callback frequency

**Migration Path:**
1. **Keep specialized observers** for:
   - Cleanup observers (combat-score.js) - short-lived, specific purpose
   - Queue menu observer (action-time-display.js) - needs disconnect/reconnect logic
   
2. **Migrate to centralized observer:**
   - quick-input-buttons.js:59 → Use `domObserver.onClass()` for action panels
   - panel-observer.js → Already should be using centralized system
   - house-panel-observer.js → Consider migrating to `domObserver.onClass()`

**Files to Review:**
```bash
# Check current usage patterns
grep -n "new MutationObserver" src/features/actions/quick-input-buttons.js
grep -n "new MutationObserver" src/features/house/house-panel-observer.js
grep -n "domObserver.register\|domObserver.onClass" src/features/actions/panel-observer.js
```

**Expected Improvement:** ~15-20% less DOM observation overhead

---

## Priority 4: Extract Shared Action Calculation Logic

### Current State
Two massive UI files with ~400-500 lines of duplicated calculation logic:

**quick-input-buttons.js (1,181 lines):**
- Lines 100-573: Action time/efficiency calculation
- Lines 500-570: `getTotalEfficiency()` method (duplicated)
- Equipment speed/efficiency parsing
- Tea efficiency parsing
- House efficiency calculation
- Action Level bonus calculation

**action-time-display.js (950 lines):**
- Lines 536-700: Action time calculation (near-identical to quick-input)
- Same equipment parsing
- Same tea parsing
- Same house efficiency
- Same efficiency stacking logic

### Duplication Examples
Both files import and call:
```javascript
import { parseEquipmentSpeedBonuses, parseEquipmentEfficiencyBonuses } from '../../utils/equipment-parser.js';
import { parseTeaEfficiency, getDrinkConcentration, parseActionLevelBonus } from '../../utils/tea-parser.js';
import { calculateHouseEfficiency } from '../../utils/house-efficiency.js';
import { stackAdditive } from '../../utils/efficiency.js';
```

Both files have methods that do the same thing:
- Calculate action time with speed bonuses
- Calculate total efficiency (level + house + equipment + tea + community)
- Apply efficiency to action calculations
- Handle Action Level bonus from teas

### Solution Strategy

**Create:** `utils/action-calculator.js`

**Extract shared logic:**
```javascript
/**
 * Calculate complete action statistics
 * @param {Object} actionDetails - Action detail object from game data
 * @param {Object} options - { gameData, equipment, skills }
 * @returns {Object} { actionTime, totalEfficiency, efficiencyBreakdown }
 */
export function calculateActionStats(actionDetails, options) {
    // All the duplicated logic
}

/**
 * Calculate action time with all speed bonuses
 */
export function calculateActionTime(actionDetails, options) {
    // Speed bonus logic
}

/**
 * Calculate total efficiency with full breakdown
 */
export function calculateTotalEfficiency(actionDetails, options) {
    // Efficiency stacking logic
}
```

**Refactor:**
1. Create `utils/action-calculator.js`
2. Move shared calculation logic from both files
3. Update quick-input-buttons.js to import from action-calculator
4. Update action-time-display.js to import from action-calculator
5. Run build and test extensively

**⚠️ CAUTION:**
- These are **high-traffic, user-facing features**
- Action time display appears on every action panel
- Quick input buttons handle Max button calculations
- Must maintain exact same behavior
- Thorough testing required

**Test Plan:**
1. Test action time display for multiple action types
2. Test quick input buttons (hour presets, Max button)
3. Test efficiency calculations with:
   - Different skill levels
   - Various house levels
   - Active teas (Efficiency Tea, skill teas)
   - Community buffs
4. Verify XP calculations in quick-input collapsible section
5. Test with edge cases (level 1, max level, no equipment)

**Files Affected:**
- `src/utils/action-calculator.js` (NEW)
- `src/features/actions/quick-input-buttons.js` (refactor)
- `src/features/actions/action-time-display.js` (refactor)

**Estimated Savings:** ~400-500 lines of duplicate logic
**Risk Level:** HIGH - requires careful testing
**Time Estimate:** 2-3 hours for extraction + testing

---

## Notes

Both priorities require careful implementation due to:
- **Priority 3:** DOM observation is critical for script functionality
- **Priority 4:** Action calculations are used constantly by users

Recommend tackling these one at a time with full testing between each.
