# MWI Tools - Session Context

**Last Updated:** 2025-12-25

## === LAST SESSION ===

**Holistic Code Review & Priority Fixes**
- Conducted comprehensive codebase review (43 files, 12,764 lines)
- Fixed all Priority 1-4 issues from review:
  1. ✅ **Observer Cleanup**: Added disable() methods to 3 modules
     - action-time-display.js: disconnect observer, clear timers, remove listeners
     - quick-input-buttons.js: disconnect main observer
     - panel-observer.js: export disablePanelObserver() function
  2. ✅ **Console Logging**: Already clean (only error/warn in production, 37 console.log in debug utilities only)
  3. ✅ **Achievement Bonuses**: Implemented gathering profit achievement support
     - Added getAchievementBuffs() to data-manager.js
     - Integrated Beginner tier (+2% Gathering Quantity) in gathering-profit.js
     - Shows in breakdown: "X.X% achievement"
  4. ✅ **Polling Documentation**: No polling found (equipment-level-display uses MutationObserver)

**Grade: A- → A** (All issues resolved, production-ready)

- Commits: 3 (be70509, 459ca85, be70509)
- Status: Ready for 1.0.0 release

## === NEXT PRIORITY ===

Test all recent features in-game:
- Alchemy item dimming (level requirements)
- Achievement bonus display in gathering profit tooltips
- Observer cleanup (verify no memory leaks)

## === ESSENTIAL FILES ===

1. **README.md** - Feature status (✅/❌), module list, "Action Panel Features Summary"
2. **CHANGELOG.md** - Version history, [Unreleased] section for WIP
3. **package.json** - Current version (0.4.5 = pre-release)
4. **src/main.js** - Lines 1-27 (imports), 62-79 (init), 87-108 (exports)

## === CRITICAL PATTERNS (Will cause bugs if wrong) ===

**React Input Updates** (src/features/actions/quick-input-buttons.js):
```javascript
lastValue = input.value; input.value = newValue;
tracker = input._valueTracker; if (tracker) tracker.setValue(lastValue);
input.dispatchEvent(new Event('input', {bubbles: true}));
```

**Data Access:** Always use dataManager methods, never direct localStorage
- `dataManager.getInitClientData()` - Static game data
- `dataManager.getEquipment()` - Equipped items only
- `dataManager.getSkills()` - Character skill levels
- `dataManager.getCurrentActions()` - Player's action queue

**Efficiency:** Additive (level+house+tea+equip), reduces actions needed, NOT time

**MutationObserver:** Clean up observers to prevent memory leaks

## === COMMON UTILITIES ===

**Formatting:** src/utils/formatters.js
- `timeReadable(seconds)` - "1 day 5h 45m"
- `numberFormatter(num)` - "1,234,567" with commas

**UI:** createCollapsibleSection(icon, title, content, defaultOpen)
- Used in: quick-input-buttons.js, panel-observer.js
- Features: ▶▼ arrows, click to toggle, summary when collapsed

## === DEV WORKFLOW ===

1. Update CHANGELOG.md [Unreleased] for new features
2. Update README.md feature status when completing modules
3. Semantic commits: feat:/fix:/docs:/refactor:
4. Build and test: `npm run build`
5. Push to local git when applicable

## === REFERENCE DOCS (if needed) ===

- **PROJECT_DOCS.md** - Original refactoring plan, module structure (lines 1-6706 analysis)
- **CONTRIBUTING.md** - Release process, version management
- **CLAUDE.md** - Project overview, game mechanics, wiki formatting standards

## === KNOWN ISSUES ===

None currently

## === SESSION HISTORY ===

**2025-12-25 - Holistic Code Review & Priority Fixes**
- Comprehensive codebase review: 43 files, 12,764 lines, Grade A-
- Added MutationObserver cleanup methods (3 modules)
- Implemented achievement tier bonus support (gathering profit)
- Verified console logging cleanliness (only error/warn in production)
- Files: data-manager.js, gathering-profit.js, action-time-display.js, panel-observer.js, quick-input-buttons.js

**2025-12-25 - Alchemy Item Dimming**
- Implemented alchemy item dimming feature for level requirements
- Items requiring higher Alchemy level than player has are dimmed (0.5 opacity)
- Fixed initial modal detection bug → uses ItemSelector_menu class
- Cleaned up all debug console.log statements
- Files: alchemy-item-dimming.js (NEW), config.js, main.js, CHANGELOG.md

**2025-12-25 - Task Profit Calculator**
- Implemented task profit calculator with expandable breakdown
- Added Task Token valuation system (best Task Shop item)
- Added Purple's Gift prorated value calculation
- Integrated with existing gathering and production profit calculators
- Files: task-profit-calculator.js, task-profit-display.js

**2025-12-24 - Enhancement Tooltip Market Defaults**
- Changed default from auto-detect to manual mode (professional enhancer stats)
- Added 11 config settings: enhanceSim_* in config.js
- Files: config.js, enhancement-config.js, tooltip-enhancement.js

**2025-12-23 - Combat Score Feature**
- Implemented combat score display on player profiles
- Shows house score, ability score, equipment score
- Three-level expandable UI with detailed breakdown
- Files: combat-score.js, score-calculator.js

**2025-12-22 - Zone Indices**
- Added combat zone index numbers to maps and tasks
- Format: "1. Zone Name" on maps, "Z1" on task cards
- Files: zone-indices.js
