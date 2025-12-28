/**
 * Enhancement Session Data Structure
 * Represents a single enhancement tracking session for one item
 */

/**
 * Session states
 */
export const SessionState = {
    IDLE: 'idle',           // No active session
    TRACKING: 'tracking',   // Currently tracking enhancements
    COMPLETED: 'completed', // Target reached or manually stopped
    ARCHIVED: 'archived'    // Historical session (read-only)
};

/**
 * Create a new enhancement session
 * @param {string} itemHrid - Item HRID being enhanced
 * @param {string} itemName - Display name of item
 * @param {number} startLevel - Starting enhancement level
 * @param {number} targetLevel - Target enhancement level (1-20)
 * @param {number} protectFrom - Level to start using protection items (0 = never)
 * @returns {Object} New session object
 */
export function createSession(itemHrid, itemName, startLevel, targetLevel, protectFrom = 0) {
    const now = Date.now();

    return {
        // Session metadata
        id: `session_${now}`,
        state: SessionState.TRACKING,
        itemHrid,
        itemName,
        startLevel,
        targetLevel,
        currentLevel: startLevel,
        protectFrom,

        // Timestamps
        startTime: now,
        lastUpdateTime: now,
        endTime: null,

        // Attempt tracking (per level)
        // Format: { 1: { success: 5, fail: 3 }, 2: { success: 4, fail: 7 }, ... }
        attemptsPerLevel: {},

        // Cost tracking
        materialCosts: {}, // Format: { itemHrid: { count: 10, totalCost: 50000 } }
        coinCost: 0,
        protectionCost: 0,
        totalCost: 0,

        // Statistics
        totalAttempts: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        longestSuccessStreak: 0,
        longestFailureStreak: 0,
        currentStreak: { type: null, count: 0 }, // 'success' or 'fail'

        // Milestones reached
        milestonesReached: [] // [5, 10, 15, 20]
    };
}

/**
 * Initialize attempts tracking for a level
 * @param {Object} session - Session object
 * @param {number} level - Enhancement level
 */
export function initializeLevelTracking(session, level) {
    if (!session.attemptsPerLevel[level]) {
        session.attemptsPerLevel[level] = {
            success: 0,
            fail: 0
        };
    }
}

/**
 * Record a successful enhancement attempt
 * @param {Object} session - Session object
 * @param {number} newLevel - New level after success
 */
export function recordSuccess(session, newLevel) {
    const previousLevel = session.currentLevel;

    // Initialize tracking if needed
    initializeLevelTracking(session, previousLevel);

    // Record success
    session.attemptsPerLevel[previousLevel].success++;
    session.totalAttempts++;
    session.totalSuccesses++;

    // Update current level
    session.currentLevel = newLevel;

    // Update streaks
    if (session.currentStreak.type === 'success') {
        session.currentStreak.count++;
    } else {
        session.currentStreak = { type: 'success', count: 1 };
    }

    if (session.currentStreak.count > session.longestSuccessStreak) {
        session.longestSuccessStreak = session.currentStreak.count;
    }

    // Check for milestones
    if ([5, 10, 15, 20].includes(newLevel) && !session.milestonesReached.includes(newLevel)) {
        session.milestonesReached.push(newLevel);
    }

    // Update timestamp
    session.lastUpdateTime = Date.now();

    // Check if target reached
    if (newLevel >= session.targetLevel) {
        session.state = SessionState.COMPLETED;
        session.endTime = Date.now();
    }
}

/**
 * Record a failed enhancement attempt
 * @param {Object} session - Session object
 */
export function recordFailure(session) {
    const level = session.currentLevel;

    // Initialize tracking if needed
    initializeLevelTracking(session, level);

    // Record failure
    session.attemptsPerLevel[level].fail++;
    session.totalAttempts++;
    session.totalFailures++;

    // Update streaks
    if (session.currentStreak.type === 'fail') {
        session.currentStreak.count++;
    } else {
        session.currentStreak = { type: 'fail', count: 1 };
    }

    if (session.currentStreak.count > session.longestFailureStreak) {
        session.longestFailureStreak = session.currentStreak.count;
    }

    // Update timestamp
    session.lastUpdateTime = Date.now();
}

/**
 * Add material cost to session
 * @param {Object} session - Session object
 * @param {string} itemHrid - Material item HRID
 * @param {number} count - Quantity used
 * @param {number} unitCost - Cost per item (from market)
 */
export function addMaterialCost(session, itemHrid, count, unitCost) {
    if (!session.materialCosts[itemHrid]) {
        session.materialCosts[itemHrid] = {
            count: 0,
            totalCost: 0
        };
    }

    session.materialCosts[itemHrid].count += count;
    session.materialCosts[itemHrid].totalCost += count * unitCost;

    // Update total cost
    recalculateTotalCost(session);
}

/**
 * Add coin cost to session
 * @param {Object} session - Session object
 * @param {number} amount - Coin amount spent
 */
export function addCoinCost(session, amount) {
    session.coinCost += amount;
    recalculateTotalCost(session);
}

/**
 * Add protection item cost to session
 * @param {Object} session - Session object
 * @param {number} cost - Protection item cost
 */
export function addProtectionCost(session, cost) {
    session.protectionCost += cost;
    recalculateTotalCost(session);
}

/**
 * Recalculate total cost from all sources
 * @param {Object} session - Session object
 */
function recalculateTotalCost(session) {
    const materialTotal = Object.values(session.materialCosts)
        .reduce((sum, m) => sum + m.totalCost, 0);

    session.totalCost = materialTotal + session.coinCost + session.protectionCost;
}

/**
 * Get session duration in seconds
 * @param {Object} session - Session object
 * @returns {number} Duration in seconds
 */
export function getSessionDuration(session) {
    const endTime = session.endTime || Date.now();
    return Math.floor((endTime - session.startTime) / 1000);
}

/**
 * Calculate success rate for a specific level
 * @param {Object} session - Session object
 * @param {number} level - Enhancement level
 * @returns {number} Success rate percentage (0-100)
 */
export function getLevelSuccessRate(session, level) {
    const attempts = session.attemptsPerLevel[level];
    if (!attempts) return 0;

    const total = attempts.success + attempts.fail;
    if (total === 0) return 0;

    return (attempts.success / total) * 100;
}

/**
 * Calculate overall success rate
 * @param {Object} session - Session object
 * @returns {number} Success rate percentage (0-100)
 */
export function getOverallSuccessRate(session) {
    if (session.totalAttempts === 0) return 0;
    return (session.totalSuccesses / session.totalAttempts) * 100;
}

/**
 * Get total attempts for a specific level
 * @param {Object} session - Session object
 * @param {number} level - Enhancement level
 * @returns {number} Total attempts
 */
export function getLevelAttempts(session, level) {
    const attempts = session.attemptsPerLevel[level];
    if (!attempts) return 0;
    return attempts.success + attempts.fail;
}

/**
 * Finalize session (mark as completed)
 * @param {Object} session - Session object
 */
export function finalizeSession(session) {
    session.state = SessionState.COMPLETED;
    session.endTime = Date.now();
}

/**
 * Archive session (mark as read-only historical data)
 * @param {Object} session - Session object
 */
export function archiveSession(session) {
    session.state = SessionState.ARCHIVED;
    if (!session.endTime) {
        session.endTime = Date.now();
    }
}

/**
 * Check if session matches given item and level criteria (for resume logic)
 * @param {Object} session - Session object
 * @param {string} itemHrid - Item HRID
 * @param {number} currentLevel - Current enhancement level
 * @param {number} targetLevel - Target level
 * @returns {boolean} True if session matches
 */
export function sessionMatches(session, itemHrid, currentLevel, targetLevel) {
    return (
        session.itemHrid === itemHrid &&
        session.currentLevel === currentLevel &&
        session.targetLevel === targetLevel &&
        session.state === SessionState.TRACKING
    );
}

/**
 * Validate session data integrity
 * @param {Object} session - Session object
 * @returns {boolean} True if valid
 */
export function validateSession(session) {
    if (!session || typeof session !== 'object') return false;

    // Required fields
    if (!session.id || !session.itemHrid || !session.itemName) return false;
    if (typeof session.startLevel !== 'number' || typeof session.targetLevel !== 'number') return false;
    if (typeof session.currentLevel !== 'number') return false;

    // Validate level ranges
    if (session.startLevel < 0 || session.startLevel > 20) return false;
    if (session.targetLevel < 1 || session.targetLevel > 20) return false;
    if (session.currentLevel < 0 || session.currentLevel > 20) return false;

    // Validate costs are non-negative
    if (session.totalCost < 0 || session.coinCost < 0 || session.protectionCost < 0) return false;

    return true;
}
