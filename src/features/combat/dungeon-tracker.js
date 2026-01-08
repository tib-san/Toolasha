/**
 * Dungeon Tracker Core
 * Tracks dungeon progress in real-time using WebSocket messages
 */

import webSocketHook from '../../core/websocket.js';
import dungeonTrackerStorage from './dungeon-tracker-storage.js';
import dataManager from '../../core/data-manager.js';

class DungeonTracker {
    constructor() {
        this.isTracking = false;
        this.currentRun = null;
        this.waveStartTime = null;
        this.waveTimes = [];
        this.updateCallbacks = [];
        this.pendingDungeonInfo = null; // Store dungeon info before tracking starts
    }

    /**
     * Initialize dungeon tracker
     */
    initialize() {
        // Listen for new_battle messages (wave start)
        webSocketHook.on('new_battle', (data) => this.onNewBattle(data));

        // Listen for action_completed messages (wave complete)
        webSocketHook.on('action_completed', (data) => this.onActionCompleted(data));

        // Listen for actions_updated to detect flee/cancel
        webSocketHook.on('actions_updated', (data) => this.onActionsUpdated(data));
    }

    /**
     * Handle actions_updated message (detect flee/cancel and dungeon start)
     * @param {Object} data - actions_updated message data
     */
    onActionsUpdated(data) {
        // Check if any dungeon action was added or removed
        if (data.endCharacterActions) {
            for (const action of data.endCharacterActions) {
                // Check if this is a dungeon action
                if (action.actionHrid?.startsWith('/actions/combat/') &&
                    action.wave !== undefined) {

                    if (action.isDone === false) {
                        // Dungeon action added to queue - store info for when new_battle fires
                        this.pendingDungeonInfo = {
                            dungeonHrid: action.actionHrid,
                            tier: action.difficultyTier
                        };

                        // If already tracking (somehow), update immediately
                        if (this.isTracking && !this.currentRun.dungeonHrid) {
                            this.currentRun.dungeonHrid = action.actionHrid;
                            this.currentRun.tier = action.difficultyTier;

                            const dungeonInfo = dungeonTrackerStorage.getDungeonInfo(action.actionHrid);
                            if (dungeonInfo) {
                                this.currentRun.maxWaves = dungeonInfo.maxWaves;
                                this.notifyUpdate();
                            }
                        }
                    } else if (action.isDone === true && this.isTracking && this.currentRun) {
                        // Dungeon action marked as done (completion or flee)

                        // If we don't have dungeon info yet, grab it from this action
                        if (!this.currentRun.dungeonHrid) {
                            this.currentRun.dungeonHrid = action.actionHrid;
                            this.currentRun.tier = action.difficultyTier;

                            const dungeonInfo = dungeonTrackerStorage.getDungeonInfo(action.actionHrid);
                            if (dungeonInfo) {
                                this.currentRun.maxWaves = dungeonInfo.maxWaves;
                                // Update UI with the name before resetting
                                this.notifyUpdate();
                            }
                        }

                        // Check if this was a successful completion or early exit
                        const allWavesCompleted = this.currentRun.maxWaves &&
                                                  this.currentRun.wavesCompleted >= this.currentRun.maxWaves;

                        if (!allWavesCompleted) {
                            // Early exit (fled, died, or failed)
                            this.resetTracking();
                        }
                        // If it was a successful completion, action_completed will handle it
                        return;
                    }
                }
            }
        }
    }

    /**
     * Handle new_battle message (wave start)
     * @param {Object} data - new_battle message data
     */
    onNewBattle(data) {
        // Only track if we have wave data
        if (data.wave === undefined) {
            return;
        }

        // Wave 0 = first wave = dungeon start
        if (data.wave === 0) {
            this.startDungeon(data);
        } else if (!this.isTracking) {
            // Mid-dungeon start - initialize tracking anyway
            this.startDungeon(data);
        } else {
            // Subsequent wave (already tracking)
            this.startWave(data);
        }
    }

    /**
     * Start tracking a new dungeon run
     * @param {Object} data - new_battle message data
     */
    startDungeon(data) {
        // Get dungeon info - prioritize pending info from actions_updated
        let dungeonHrid = null;
        let tier = null;
        let maxWaves = null;

        if (this.pendingDungeonInfo) {
            // Use info from actions_updated message
            dungeonHrid = this.pendingDungeonInfo.dungeonHrid;
            tier = this.pendingDungeonInfo.tier;

            const dungeonInfo = dungeonTrackerStorage.getDungeonInfo(dungeonHrid);
            if (dungeonInfo) {
                maxWaves = dungeonInfo.maxWaves;
            }

            // Clear pending info
            this.pendingDungeonInfo = null;
        }

        this.isTracking = true;
        this.waveStartTime = new Date(data.combatStartTime);
        this.waveTimes = [];

        this.currentRun = {
            dungeonHrid: dungeonHrid,
            tier: tier,
            startTime: this.waveStartTime.getTime(),
            currentWave: data.wave, // Use actual wave number (1-indexed)
            maxWaves: maxWaves,
            wavesCompleted: 0 // No waves completed yet (will update as waves complete)
        };

        this.notifyUpdate();
    }

    /**
     * Start tracking a new wave
     * @param {Object} data - new_battle message data
     */
    startWave(data) {
        if (!this.isTracking) {
            return;
        }

        // Update current wave
        this.waveStartTime = new Date(data.combatStartTime);
        this.currentRun.currentWave = data.wave;

        this.notifyUpdate();
    }

    /**
     * Handle action_completed message (wave complete)
     * @param {Object} data - action_completed message data
     */
    onActionCompleted(data) {
        if (!this.isTracking) {
            return;
        }

        const action = data.endCharacterAction;

        // Only process dungeon actions
        if (!action.actionHrid || !action.actionHrid.startsWith('/actions/combat/')) {
            return;
        }

        // Ignore non-dungeon combat (zones don't have maxCount or wave field)
        if (action.wave === undefined) {
            return;
        }

        // Set dungeon info if not already set (fallback for mid-dungeon starts)
        if (!this.currentRun.dungeonHrid) {
            this.currentRun.dungeonHrid = action.actionHrid;
            this.currentRun.tier = action.difficultyTier;

            const dungeonInfo = dungeonTrackerStorage.getDungeonInfo(action.actionHrid);
            if (dungeonInfo) {
                this.currentRun.maxWaves = dungeonInfo.maxWaves;
            }

            // Notify update now that we have dungeon name
            this.notifyUpdate();
        }

        // Calculate wave time
        const waveEndTime = Date.now();
        const waveTime = waveEndTime - this.waveStartTime.getTime();
        this.waveTimes.push(waveTime);

        // Update waves completed (action.wave is already 1-indexed)
        this.currentRun.wavesCompleted = action.wave;

        console.log(`[Dungeon Tracker] Wave ${action.wave} completed in ${(waveTime / 1000).toFixed(1)}s`);

        // Check if dungeon is complete
        if (action.isDone) {
            // Check if this was a successful completion (all waves done) or early exit
            const allWavesCompleted = this.currentRun.maxWaves &&
                                      this.currentRun.wavesCompleted >= this.currentRun.maxWaves;

            if (allWavesCompleted) {
                // Successful completion
                this.completeDungeon();
            } else {
                // Early exit (fled, died, or failed)
                this.resetTracking();
            }
        } else {
            this.notifyUpdate();
        }
    }

    /**
     * Complete the current dungeon run
     */
    async completeDungeon() {
        if (!this.currentRun || !this.isTracking) {
            return;
        }

        const endTime = Date.now();
        const totalTime = endTime - this.currentRun.startTime;

        // Calculate statistics
        const avgWaveTime = this.waveTimes.reduce((sum, time) => sum + time, 0) / this.waveTimes.length;
        const fastestWave = Math.min(...this.waveTimes);
        const slowestWave = Math.max(...this.waveTimes);

        // Build complete run object
        const completedRun = {
            dungeonHrid: this.currentRun.dungeonHrid,
            tier: this.currentRun.tier,
            startTime: this.currentRun.startTime,
            endTime,
            totalTime,
            avgWaveTime,
            fastestWave,
            slowestWave,
            wavesCompleted: this.currentRun.wavesCompleted,
            waveTimes: [...this.waveTimes]
        };

        // Save to storage
        await dungeonTrackerStorage.saveRun(completedRun);

        console.log('[Dungeon Tracker] Dungeon completed:', completedRun);

        // Notify completion
        this.notifyCompletion(completedRun);

        // Reset state
        this.resetTracking();
    }

    /**
     * Reset tracking state (on completion, flee, or death)
     */
    resetTracking() {
        this.isTracking = false;
        this.currentRun = null;
        this.waveStartTime = null;
        this.waveTimes = [];
        this.pendingDungeonInfo = null;
        this.notifyUpdate();
    }

    /**
     * Get current run state
     * @returns {Object|null} Current run state or null
     */
    getCurrentRun() {
        if (!this.isTracking || !this.currentRun) {
            return null;
        }

        // Calculate current elapsed time
        const now = Date.now();
        const totalElapsed = now - this.currentRun.startTime;
        const currentWaveElapsed = now - this.waveStartTime.getTime();

        // Calculate average wave time so far
        const avgWaveTime = this.waveTimes.length > 0
            ? this.waveTimes.reduce((sum, time) => sum + time, 0) / this.waveTimes.length
            : 0;

        // Calculate ETA
        const remainingWaves = this.currentRun.maxWaves - this.currentRun.wavesCompleted;
        const estimatedTimeRemaining = avgWaveTime > 0 ? avgWaveTime * remainingWaves : 0;

        // Calculate fastest/slowest wave times
        const fastestWave = this.waveTimes.length > 0 ? Math.min(...this.waveTimes) : 0;
        const slowestWave = this.waveTimes.length > 0 ? Math.max(...this.waveTimes) : 0;

        return {
            dungeonHrid: this.currentRun.dungeonHrid,
            dungeonName: this.currentRun.dungeonHrid
                ? dungeonTrackerStorage.getDungeonInfo(this.currentRun.dungeonHrid)?.name
                : 'Unknown',
            tier: this.currentRun.tier,
            currentWave: this.currentRun.currentWave, // Already 1-indexed from new_battle message
            maxWaves: this.currentRun.maxWaves,
            wavesCompleted: this.currentRun.wavesCompleted,
            totalElapsed,
            currentWaveElapsed,
            avgWaveTime,
            fastestWave,
            slowestWave,
            estimatedTimeRemaining
        };
    }

    /**
     * Register a callback for run updates
     * @param {Function} callback - Callback function
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * Notify all registered callbacks of an update
     */
    notifyUpdate() {
        for (const callback of this.updateCallbacks) {
            try {
                callback(this.getCurrentRun());
            } catch (error) {
                console.error('[Dungeon Tracker] Update callback error:', error);
            }
        }
    }

    /**
     * Notify all registered callbacks of completion
     * @param {Object} completedRun - Completed run data
     */
    notifyCompletion(completedRun) {
        for (const callback of this.updateCallbacks) {
            try {
                callback(null, completedRun);
            } catch (error) {
                console.error('[Dungeon Tracker] Completion callback error:', error);
            }
        }
    }

    /**
     * Check if currently tracking a dungeon
     * @returns {boolean} True if tracking
     */
    isTrackingDungeon() {
        return this.isTracking;
    }
}

// Create and export singleton instance
const dungeonTracker = new DungeonTracker();

export default dungeonTracker;
export { DungeonTracker };
