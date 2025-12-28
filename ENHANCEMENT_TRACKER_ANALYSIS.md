# Enhancement Tracker Integration Analysis

## Executive Summary

**Existing Overlap:** ~40% of tracker functionality already exists in Toolasha
**Net New Code:** ~60% (primarily tracking, notifications, UI panel)
**Reusable Infrastructure:** High - most core systems are ready

---

## Function Comparison Matrix

### ✅ Already Exists in Toolasha (Can Reuse)

| Tracker Function | Toolasha Equivalent | Location | Notes |
|-----------------|---------------------|----------|-------|
| `getMarketPrice()` | `marketAPI.getPrice()` | `api/marketplace.js` | ✅ Better - uses cached data, auto-refresh |
| `loadMarketData()` | `marketAPI.fetch()` | `api/marketplace.js` | ✅ Superior - IndexedDB cache, error handling |
| `getBaseItemLevel()` | `dataManager.getItemDetails()` | `core/data-manager.js` | ✅ Same functionality |
| `Enhancelate()` | `calculateEnhancement()` | `utils/enhancement-calculator.js` | ✅ Already ported! Uses math.js |
| `calculateSuccessXP()` | Not needed | N/A | Game calculates this server-side |
| `calculateFailureXP()` | Not needed | N/A | Game calculates this server-side |
| `getWisdomBuff()` | `getEnhancingParams()` | `utils/enhancement-config.js` | ✅ More comprehensive |
| `calculateEnhancerBonus()` | `detectEnhancingGear()` | `utils/enhancement-gear-detector.js` | ✅ Better - detects all gear |
| `calculateGloveBonus()` | `detectEnhancingGear()` | `utils/enhancement-gear-detector.js` | ✅ Included in above |
| `formatNumber()` | `coinFormatter()` / `formatKMB()` | `utils/formatters.js` | ✅ Multiple formatters available |
| `formatDuration()` | `timeReadable()` | `utils/formatters.js` | ✅ More comprehensive |
| `hookWS()` | `webSocketHook.install()` | `core/websocket.js` | ✅ Already hooked! |
| `handleMessage()` | `webSocketHook.onMessage()` | `core/websocket.js` | ✅ Event-based system |
| `getEnhancementState()` | `dataManager.getCurrentActions()` | `core/data-manager.js` | ✅ Real-time action data |

**Summary:** 14/14 core utility functions already exist in better form

---

### 🆕 New Functions Needed (Tracker-Specific)

| Tracker Function | Purpose | Complexity | Notes |
|-----------------|---------|------------|-------|
| **Session Management** |||
| `startNewItemSession()` | Begin tracking new item | Medium | New - multi-session support |
| `findMatchingPreviousSession()` | Resume tracking | Low | New - session matching logic |
| `finalizeCurrentSession()` | Close session | Low | New |
| `navigateSessions()` | Switch between sessions | Low | New - UI navigation |
| `cleanSessionIndices()` | Cleanup session data | Low | New |
| **Statistics** |||
| `getCurrentAttemptNumber()` | Track attempt count | Low | New |
| `calculateSessionDuration()` | Session time tracking | Low | Use existing `timeReadable()` |
| `calculateXpPerHour()` | XP rate calculation | Low | Simple math |
| `getSessionDisplayData()` | Format session stats | Medium | UI data preparation |
| `updateStats()` | Refresh stats display | Medium | Tied to UI |
| `renderStats()` | Display stats in panel | Medium | UI rendering |
| **Tracking** |||
| `handleEnhancement()` | Process enhancement event | High | **Core logic** - most important |
| `handleSuccess()` | Record success | Medium | Updates session data |
| `handleFailure()` | Record failure | Medium | Updates session data |
| `trackMaterialCosts()` | Track material usage | Medium | Can use existing `marketAPI` |
| **Storage** |||
| `saveEnhancementData()` | Persist to localStorage | Low | Use existing `storage.js` |
| `validateSession()` | Data integrity check | Low | Validation logic |
| **UI - Notifications** |||
| `showNotification()` | Display toast notification | Medium | New system |
| `createStandardNotification()` | Success notification | Low | UI creation |
| `createFailureNotification()` | Failure notification | Low | UI creation |
| `createMilestoneNotification()` | Milestone (+5, +10, +15, +20) | Low | UI creation |
| `animateNotification()` | Notification animations | Low | CSS animations |
| `getNotificationDuration()` | Timing for notifications | Low | Simple logic |
| **UI - Floating Panel** |||
| `createFloatingUI()` | Main stats panel | High | Major UI component |
| `initializeFloatingUI()` | Setup panel | Medium | Initialization |
| `updateFloatingUI()` | Refresh panel data | Medium | Tied to tracking |
| `toggleFloatingUI()` | Show/hide panel | Low | Simple toggle |
| `cleanupFloatingUI()` | Remove panel | Low | Cleanup |
| `addEnhancementPanelToggle()` | Add toggle button | Low | Button injection |
| **UI - Visual Effects** |||
| `showTargetAchievedCelebration()` | Goal reached celebration | Low | Optional - nice to have |
| `addHolyEffects()` | Milestone effects | Low | Optional |
| `createFireworkBurst()` | Firework animation | Low | Optional |
| **Probability Calculations** |||
| `calculateEnhancementProbabilities()` | Call Enhancelate | Low | Wrapper for existing function |
| `initializeEnhancelation()` | Setup calculator | Low | Already done |
| **Helpers** |||
| `parseItemHash()` | Parse item data | Low | Simple parsing |
| `getProtectionItemHrid()` | Get protection item | Low | Data lookup |
| `getLevelGradient()` | Color coding | Low | UI styling |
| `buildTableHTML()` | Generate HTML tables | Low | Template generation |

**Summary:** 42 new functions needed, but many are simple wrappers or UI-only

---

## Infrastructure Comparison

### ✅ Toolasha Has Better Infrastructure

| System | Tracker | Toolasha | Winner |
|--------|---------|----------|--------|
| **Market Data** | Manual localStorage reads | `marketAPI` with auto-refresh, caching | ✅ **Toolasha** |
| **Game Data** | Manual localStorage parsing | `dataManager` with event system | ✅ **Toolasha** |
| **Storage** | Raw localStorage | IndexedDB via `storage.js` | ✅ **Toolasha** |
| **WebSocket** | Monkey-patches XMLHttpRequest | Proper WebSocket hook | ✅ **Toolasha** |
| **Settings** | Hard-coded in script | Config system with UI | ✅ **Toolasha** |
| **Formatters** | Single custom formatter | 6 specialized formatters | ✅ **Toolasha** |
| **DOM Watching** | Manual MutationObserver | Centralized `domObserver` | ✅ **Toolasha** |

---

## Code Reuse Opportunities

### 1. Market Data (100% reusable)
```javascript
// Tracker uses:
const marketDataStr = localStorage.getItem('MWITools_marketAPI_json');
const price = marketRoot["0"].a || marketRoot["0"].b || 0;

// Toolasha has:
const price = marketAPI.getPrice(itemHrid, enhancementLevel);
// ✅ Direct replacement - no changes needed
```

### 2. Enhancement Calculations (100% reusable)
```javascript
// Tracker has Enhancelate() embedded
// Toolasha has it separated:
import { calculateEnhancement } from './utils/enhancement-calculator.js';

const results = calculateEnhancement({
    enhancingLevel: 100,
    itemLevel: 80,
    targetLevel: 10,
    protectFrom: 8,
    // ... all params
});
// ✅ Already ported and tested
```

### 3. Game Data Access (100% reusable)
```javascript
// Tracker:
const initData = JSON.parse(localStorage.getItem('initClientData'));
const itemLevel = initData.itemDetailMap[itemHrid].itemLevel;

// Toolasha:
const itemDetails = dataManager.getItemDetails(itemHrid);
const itemLevel = itemDetails.itemLevel;
// ✅ Plus auto-updates when game data changes
```

### 4. WebSocket Interception (100% reusable)
```javascript
// Tracker: Monkey-patches XMLHttpRequest.prototype.send
hookedGet = originalGet;
XMLHttpRequest.prototype.open = function() { /* ... */ }

// Toolasha: Clean event system
webSocketHook.onMessage('enhanceItem', (message) => {
    // Handle enhancement event
});
// ✅ Already captures all WebSocket messages
```

### 5. Storage (90% reusable)
```javascript
// Tracker:
localStorage.setItem('enhancementData', JSON.stringify(data));

// Toolasha:
await storage.setJSON('enhancementData', data, 'features');
// ✅ Better - uses IndexedDB for large data
// ⚠️  Async - need to handle promises
```

---

## What's Actually New

### Core Tracking Logic (~800 lines)
- Session management (start, resume, finalize)
- Success/failure event handlers
- Material cost tracking
- Statistics aggregation
- Attempt counting

### UI Components (~1200 lines)
- Floating stats panel (draggable)
- Notification system (4 types)
- Visual celebrations (optional)
- Session switcher
- Real-time stats display

### Data Structures (~200 lines)
```javascript
enhancementData = {
    0: { // Session index
        "其他数据": {
            "物品名称": "Celestial Armor",
            "物品 HRID": "/items/armor_celestial",
            "起始等级": 0,
            "目标等级": 10,
            "当前等级": 5,
            "保护开始等级": 8,
            "保护总成本": 50000000
        },
        "尝试数据": {
            1: { "成功次数": 5, "失败次数": 3 },
            2: { "成功次数": 4, "失败次数": 5 },
            // ... per level
        },
        "材料消耗": {
            "/items/enhancement_stone": { count: 100, totalCost: 5000000 }
        },
        "硬币消耗": { count: 500, totalCost: 500 },
        "总成本": 55000500
    }
}
```

---

## Integration Strategy

### Phase 1: Core Tracking (Reuse 80%)
```javascript
// NEW: Session management
class EnhancementTracker {
    constructor() {
        this.sessions = {};
        this.currentSession = null;
    }

    // NEW: Event handlers
    handleEnhancementStart(action) { /* ... */ }
    handleEnhancementResult(message) { /* ... */ }

    // REUSE: All data access
    getCosts() {
        return marketAPI.getPrice(itemHrid); // ✅ Existing
    }

    // REUSE: Calculations
    calculateExpectedAttempts() {
        return calculateEnhancement(params); // ✅ Existing
    }
}
```

### Phase 2: Statistics (Reuse 60%)
```javascript
// NEW: Aggregation logic
calculateSessionStats(session) {
    const successCount = /* count successes */;
    const failCount = /* count failures */;
    const totalCost = /* sum costs */;

    // REUSE: Formatting
    return {
        duration: timeReadable(seconds), // ✅ Existing
        cost: coinFormatter(totalCost),  // ✅ Existing
        xpRate: /* calculate */
    };
}
```

### Phase 3: UI (All New)
```javascript
// NEW: Floating panel
createFloatingUI() { /* ~400 lines */ }

// NEW: Notifications
showNotification(type, message) { /* ~200 lines */ }
```

---

## Dependency Analysis

### Tracker Dependencies
1. ❌ **math.js** (external CDN) - Already bundled in Toolasha ✅
2. ❌ **Manual localStorage** - Replaced with `storage.js` ✅
3. ❌ **XHR monkey-patching** - Replaced with `webSocketHook` ✅
4. ❌ **Hard-coded market URL** - Replaced with `marketAPI` ✅

### Toolasha Can Provide
1. ✅ Market price data (`marketAPI`)
2. ✅ Game data access (`dataManager`)
3. ✅ Enhancement calculations (`enhancement-calculator.js`)
4. ✅ WebSocket message capture (`webSocketHook`)
5. ✅ Storage system (`storage.js`)
6. ✅ Formatters (`formatters.js`)
7. ✅ Config system (`config.js`)
8. ✅ DOM observer (`domObserver`)

---

## Recommended Approach

### Use Existing Infrastructure (Saves ~40% effort)
✅ **Don't rewrite:**
- Market data fetching
- Game data access
- Enhancement probability calculator
- WebSocket hooks
- Storage layer
- Number formatters
- Time formatters

### Build New Components (~60% effort)
🆕 **Focus on:**
1. Session tracking state machine
2. Event handlers (success/failure)
3. Cost aggregation
4. UI components (panel + notifications)
5. Statistics calculations

### Integration Points
```javascript
// Main integration in main.js
import enhancementTracker from './features/enhancement/enhancement-tracker.js';

// Listen to WebSocket messages (already hooked!)
webSocketHook.onMessage('enhanceItem', (msg) => {
    enhancementTracker.handleEnhancementStart(msg.action);
});

webSocketHook.onMessage('enhanceItemResult', (msg) => {
    enhancementTracker.handleEnhancementResult(msg);
});
```

---

## Estimated Integration Effort

| Component | Lines of Code | Reuse % | Net New | Time Estimate |
|-----------|---------------|---------|---------|---------------|
| Session Management | 300 | 20% | 240 | 1 day |
| Event Handlers | 400 | 30% | 280 | 1.5 days |
| Cost Tracking | 200 | 60% | 80 | 0.5 days |
| Statistics | 300 | 50% | 150 | 1 day |
| Floating UI Panel | 600 | 0% | 600 | 2 days |
| Notifications | 400 | 10% | 360 | 1.5 days |
| Storage Integration | 200 | 80% | 40 | 0.5 days |
| Testing & Polish | - | - | - | 2 days |
| **TOTAL** | **~2400** | **40%** | **~1750** | **10 days** |

---

## Key Findings

1. **40% of tracker functionality already exists** in better form
2. **Core calculation engine (Enhancelate) already ported** ✅
3. **Market data, game data, formatters all ready** ✅
4. **WebSocket hooks already capturing enhancement events** ✅
5. **Net new code is primarily:**
   - Session state management (~500 lines)
   - UI components (~1000 lines)
   - Event handlers and glue code (~250 lines)

## Recommendation

**✅ Full integration is very feasible** because most infrastructure exists.

**Focus areas:**
1. Port session management logic
2. Build floating panel UI
3. Create notification system
4. Wire up WebSocket event handlers

**Can skip:**
- Market data fetching (use `marketAPI`)
- Enhancement calculations (use `calculateEnhancement()`)
- Game data parsing (use `dataManager`)
- Number formatting (use existing formatters)

This reduces the integration from **~3000 lines** to **~1750 lines** of actual new code.
