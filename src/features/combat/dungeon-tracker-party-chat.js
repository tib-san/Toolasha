/**
 * Dungeon Tracker Party Chat
 * Sends dungeon completion messages to party chat
 */

import dungeonTracker from './dungeon-tracker.js';
import dungeonTrackerStorage from './dungeon-tracker-storage.js';

class DungeonTrackerPartyChat {
    constructor() {
        this.enabled = true;
    }

    /**
     * Initialize party chat module
     */
    initialize() {
        // Register for dungeon tracker updates
        dungeonTracker.onUpdate((currentRun, completedRun) => {
            if (completedRun) {
                this.sendCompletionMessage(completedRun);
            }
        });

        console.log('[Dungeon Tracker Party Chat] Initialized');
    }

    /**
     * Send completion message to party chat
     * @param {Object} run - Completed run data
     */
    async sendCompletionMessage(run) {
        if (!this.enabled) {
            return;
        }

        try {
            // Get dungeon info
            const dungeonInfo = dungeonTrackerStorage.getDungeonInfo(run.dungeonHrid);
            if (!dungeonInfo) {
                console.warn('[Dungeon Tracker Party Chat] Unknown dungeon:', run.dungeonHrid);
                return;
            }

            // Get previous runs for comparison
            const lastRuns = await dungeonTrackerStorage.getLastRuns(run.dungeonHrid, run.tier, 10);
            const stats = await dungeonTrackerStorage.getStats(run.dungeonHrid, run.tier);
            const pb = await dungeonTrackerStorage.getPersonalBest(run.dungeonHrid, run.tier);

            // Build message
            const message = this.buildMessage(run, dungeonInfo, lastRuns, stats, pb);

            // Send to party chat
            this.sendToPartyChat(message);

        } catch (error) {
            console.error('[Dungeon Tracker Party Chat] Error sending message:', error);
        }
    }

    /**
     * Build completion message
     * @param {Object} run - Completed run
     * @param {Object} dungeonInfo - Dungeon info
     * @param {Array} lastRuns - Last 10 runs
     * @param {Object} stats - Statistics
     * @param {Object} pb - Personal best run
     * @returns {string} Message text
     */
    buildMessage(run, dungeonInfo, lastRuns, stats, pb) {
        const dungeonName = dungeonInfo.name;
        const tier = run.tier;
        const totalTime = this.formatTime(run.totalTime);
        const avgWaveTime = this.formatTime(run.avgWaveTime);

        let message = `[Toolasha] ${dungeonName} T${tier} completed in ${totalTime} (avg ${avgWaveTime}/wave)`;

        // Compare to last run
        if (lastRuns.length > 1) {
            const lastRun = lastRuns[1]; // Index 0 is the current run
            const timeDiff = run.totalTime - lastRun.totalTime;
            const faster = timeDiff < 0;
            const diffStr = this.formatTime(Math.abs(timeDiff));

            if (faster) {
                message += ` | ${diffStr} faster than last`;
            } else {
                message += ` | ${diffStr} slower than last`;
            }
        }

        // Compare to average
        if (stats.totalRuns > 1) {
            const avgDiff = run.totalTime - stats.avgTime;
            const faster = avgDiff < 0;
            const diffStr = this.formatTime(Math.abs(avgDiff));

            if (faster) {
                message += ` | ${diffStr} faster than avg`;
            } else {
                message += ` | ${diffStr} slower than avg`;
            }
        }

        // Check if personal best
        if (pb && run.totalTime === pb.totalTime) {
            message += ' | 🏆 NEW PB!';
        } else if (pb) {
            const pbDiff = run.totalTime - pb.totalTime;
            const diffStr = this.formatTime(pbDiff);
            message += ` | PB: ${this.formatTime(pb.totalTime)} (+${diffStr})`;
        }

        return message;
    }

    /**
     * Send message to party chat
     * @param {string} message - Message text
     */
    sendToPartyChat(message) {
        try {
            // Find chat input
            const chatInput = document.querySelector('textarea[placeholder="Type a message..."]');
            if (!chatInput) {
                console.warn('[Dungeon Tracker Party Chat] Chat input not found');
                return;
            }

            // Get the React fiber key for the input
            const fiberKey = Object.keys(chatInput).find(key => key.startsWith('__react'));
            if (!fiberKey) {
                console.warn('[Dungeon Tracker Party Chat] React fiber not found');
                return;
            }

            // Set the input value
            chatInput.value = message;

            // Trigger React onChange event
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            ).set;
            nativeInputValueSetter.call(chatInput, message);

            // Dispatch input event
            const inputEvent = new Event('input', { bubbles: true });
            chatInput.dispatchEvent(inputEvent);

            // Wait a bit, then find and click the send button
            setTimeout(() => {
                // Find send button (look for button near the chat input)
                const sendButton = chatInput.parentElement?.querySelector('button[type="submit"]') ||
                                   chatInput.closest('form')?.querySelector('button[type="submit"]') ||
                                   document.querySelector('button[aria-label="Send message"]');

                if (sendButton) {
                    sendButton.click();
                    console.log('[Dungeon Tracker Party Chat] Message sent:', message);
                } else {
                    console.warn('[Dungeon Tracker Party Chat] Send button not found, message typed but not sent');
                }
            }, 100);

        } catch (error) {
            console.error('[Dungeon Tracker Party Chat] Error sending to chat:', error);
        }
    }

    /**
     * Format time in milliseconds to MM:SS
     * @param {number} ms - Time in milliseconds
     * @returns {string} Formatted time
     */
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Enable party chat messages
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable party chat messages
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Check if party chat messages are enabled
     * @returns {boolean} Enabled status
     */
    isEnabled() {
        return this.enabled;
    }
}

// Create and export singleton instance
const dungeonTrackerPartyChat = new DungeonTrackerPartyChat();

export default dungeonTrackerPartyChat;
export { DungeonTrackerPartyChat };
