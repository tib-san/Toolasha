/**
 * Dungeon Tracker UI
 * Displays dungeon progress in the top bar
 */

import dungeonTracker from './dungeon-tracker.js';
import dungeonTrackerStorage from './dungeon-tracker-storage.js';
import storage from '../../core/storage.js';

class DungeonTrackerUI {
    constructor() {
        this.container = null;
        this.updateInterval = null;
        this.isCollapsed = false;
        this.isKeysExpanded = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.position = null; // { x, y } or null for default
    }

    /**
     * Initialize UI
     */
    async initialize() {
        // Load saved state
        await this.loadState();

        // Create UI elements
        this.createUI();

        // Register for dungeon tracker updates
        dungeonTracker.onUpdate((currentRun, completedRun) => {
            if (completedRun) {
                // Dungeon completed
                this.hide();
            } else if (currentRun) {
                // Dungeon in progress
                this.show();
                this.update(currentRun);
            } else {
                // No active dungeon
                this.hide();
            }
        });

        // Start update loop (updates current wave time every second)
        this.startUpdateLoop();
    }

    /**
     * Load saved state from storage
     */
    async loadState() {
        const savedState = await storage.getJSON('dungeonTracker_uiState', 'settings', null);
        if (savedState) {
            this.isCollapsed = savedState.isCollapsed || false;
            this.isKeysExpanded = savedState.isKeysExpanded || false;
            this.position = savedState.position || null;
        }
    }

    /**
     * Save current state to storage
     */
    async saveState() {
        await storage.setJSON('dungeonTracker_uiState', {
            isCollapsed: this.isCollapsed,
            isKeysExpanded: this.isKeysExpanded,
            position: this.position
        }, 'settings', true);
    }

    /**
     * Create UI elements
     */
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'mwi-dungeon-tracker';

        // Apply saved position or default
        this.updatePosition();

        // Add HTML structure
        this.container.innerHTML = `
            <div id="mwi-dt-header" style="
                background: #2d3748;
                border-radius: 6px 6px 0 0;
                cursor: move;
                user-select: none;
            ">
                <!-- Header Line 1: Dungeon Name + Wave -->
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 10px;
                ">
                    <span id="mwi-dt-dungeon-name" style="font-weight: bold; font-size: 14px; color: #4a9eff;">
                        Loading...
                    </span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span id="mwi-dt-wave-counter" style="font-size: 13px; color: #aaa;">
                            Wave 1/50
                        </span>
                        <button id="mwi-dt-collapse-btn" style="
                            background: none;
                            border: none;
                            color: #aaa;
                            cursor: pointer;
                            font-size: 16px;
                            padding: 0 4px;
                            line-height: 1;
                        " title="Collapse/Expand">▼</button>
                    </div>
                </div>

                <!-- Header Line 2: Stats (always visible) -->
                <div id="mwi-dt-header-stats" style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 4px 10px 6px 10px;
                    font-size: 12px;
                    color: #ccc;
                    gap: 12px;
                ">
                    <span>Current: <span id="mwi-dt-header-current" style="color: #fff; font-weight: bold;">00:00</span></span>
                    <span>|</span>
                    <span>Avg: <span id="mwi-dt-header-avg" style="color: #fff; font-weight: bold;">--:--</span></span>
                    <span>|</span>
                    <span>Runs: <span id="mwi-dt-header-runs" style="color: #fff; font-weight: bold;">0</span></span>
                </div>
            </div>

            <div id="mwi-dt-content" style="padding: 12px 20px; display: flex; flex-direction: column; gap: 12px;">
                <!-- Progress bar -->
                <div>
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 4px;">
                        <span id="mwi-dt-wave-percent" style="font-size: 11px; color: #4a9eff;">
                            (0%)
                        </span>
                    </div>
                    <div style="background: #333; border-radius: 4px; height: 20px; position: relative; overflow: hidden;">
                        <div id="mwi-dt-progress-bar" style="
                            background: linear-gradient(90deg, #4a9eff 0%, #6eb5ff 100%);
                            height: 100%;
                            width: 0%;
                            transition: width 0.3s ease;
                        "></div>
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 11px;
                            font-weight: bold;
                            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                        " id="mwi-dt-progress-text">0%</div>
                    </div>
                </div>

                <!-- Run-level stats (2x2 grid) -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px; color: #ccc; padding-top: 4px; border-top: 1px solid #444;">
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Current</div>
                        <div id="mwi-dt-current-time" style="color: #fff; font-weight: bold;">00:00</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Avg</div>
                        <div id="mwi-dt-avg-time" style="color: #fff; font-weight: bold;">--:--</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Fastest</div>
                        <div id="mwi-dt-fastest-time" style="color: #5fda5f; font-weight: bold;">--:--</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Slowest</div>
                        <div id="mwi-dt-slowest-time" style="color: #ff6b6b; font-weight: bold;">--:--</div>
                    </div>
                </div>

                <!-- Keys section (collapsible placeholder) -->
                <div id="mwi-dt-keys-section" style="padding-top: 8px; border-top: 1px solid #444;">
                    <div id="mwi-dt-keys-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        padding: 4px 0;
                        font-size: 12px;
                        color: #ccc;
                    ">
                        <span>Keys: Self (<span id="mwi-dt-self-keys">0</span>)</span>
                        <span id="mwi-dt-keys-toggle" style="font-size: 10px;">▼</span>
                    </div>
                    <div id="mwi-dt-keys-list" style="
                        display: none;
                        padding: 8px 0;
                        font-size: 11px;
                        color: #ccc;
                    ">
                        <!-- TODO: Party member key counts will be populated here -->
                        <div style="color: #888; font-style: italic;">Party key tracking coming soon...</div>
                    </div>
                </div>

                <!-- Run history section -->
                <div style="padding-top: 8px; border-top: 1px solid #444;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: bold; color: #ccc;">Run History</span>
                        <button id="mwi-dt-clear-all" style="
                            background: none;
                            border: 1px solid #ff6b6b;
                            color: #ff6b6b;
                            cursor: pointer;
                            font-size: 11px;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-weight: bold;
                        " title="Clear all runs">✕ Clear</button>
                    </div>
                    <div id="mwi-dt-run-list" style="
                        max-height: 150px;
                        overflow-y: auto;
                        font-size: 11px;
                        color: #ccc;
                    ">
                        <!-- Run list populated dynamically -->
                        <div style="color: #888; font-style: italic; text-align: center; padding: 8px;">No runs yet</div>
                    </div>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(this.container);

        // Setup dragging
        this.setupDragging();

        // Setup collapse button
        this.setupCollapseButton();

        // Setup keys toggle
        this.setupKeysToggle();

        // Setup clear all button
        this.setupClearAll();

        // Apply initial collapsed state
        if (this.isCollapsed) {
            this.applyCollapsedState();
        }

        // Apply initial keys expanded state
        if (this.isKeysExpanded) {
            this.applyKeysExpandedState();
        }
    }

    /**
     * Update container position and styling
     */
    updatePosition() {
        const baseStyle = `
            display: none;
            position: fixed;
            z-index: 9999;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #4a9eff;
            border-radius: 8px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #fff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;

        if (this.position) {
            // Custom position (user dragged it)
            this.container.style.cssText = `
                ${baseStyle}
                top: ${this.position.y}px;
                left: ${this.position.x}px;
                min-width: ${this.isCollapsed ? '250px' : '400px'};
            `;
        } else if (this.isCollapsed) {
            // Collapsed: top-left (near action time display)
            this.container.style.cssText = `
                ${baseStyle}
                top: 10px;
                left: 10px;
                min-width: 250px;
            `;
        } else {
            // Expanded: top-center
            this.container.style.cssText = `
                ${baseStyle}
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                min-width: 400px;
            `;
        }
    }

    /**
     * Setup dragging functionality
     */
    setupDragging() {
        const header = this.container.querySelector('#mwi-dt-header');
        if (!header) return;

        header.addEventListener('mousedown', (e) => {
            // Don't drag if clicking collapse button
            if (e.target.id === 'mwi-dt-collapse-btn') return;

            this.isDragging = true;
            const rect = this.container.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            header.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;

            // Save position (disables default centering)
            this.position = { x, y };

            // Apply position
            this.container.style.left = `${x}px`;
            this.container.style.top = `${y}px`;
            this.container.style.transform = 'none'; // Disable centering transform
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                const header = this.container.querySelector('#mwi-dt-header');
                if (header) header.style.cursor = 'move';
                this.saveState();
            }
        });
    }

    /**
     * Setup collapse button
     */
    setupCollapseButton() {
        const collapseBtn = this.container.querySelector('#mwi-dt-collapse-btn');
        if (!collapseBtn) return;

        collapseBtn.addEventListener('click', () => {
            this.toggleCollapse();
        });
    }

    /**
     * Setup keys toggle
     */
    setupKeysToggle() {
        const keysHeader = this.container.querySelector('#mwi-dt-keys-header');
        if (!keysHeader) return;

        keysHeader.addEventListener('click', () => {
            this.toggleKeys();
        });
    }

    /**
     * Setup clear all button
     */
    setupClearAll() {
        const clearBtn = this.container.querySelector('#mwi-dt-clear-all');
        if (!clearBtn) return;

        clearBtn.addEventListener('click', async () => {
            const currentRun = dungeonTracker.getCurrentRun();
            if (!currentRun) return;

            const dungeonInfo = dungeonTrackerStorage.getDungeonInfo(currentRun.dungeonHrid);
            const dungeonName = dungeonInfo?.name || 'this dungeon';

            if (confirm(`Delete all run history for ${dungeonName} T${currentRun.tier}?`)) {
                await dungeonTrackerStorage.clearHistory(currentRun.dungeonHrid, currentRun.tier);
                // Refresh display
                this.update(currentRun);
            }
        });
    }

    /**
     * Toggle keys expanded state
     */
    toggleKeys() {
        this.isKeysExpanded = !this.isKeysExpanded;

        if (this.isKeysExpanded) {
            this.applyKeysExpandedState();
        } else {
            this.applyKeysCollapsedState();
        }

        this.saveState();
    }

    /**
     * Apply keys expanded state
     */
    applyKeysExpandedState() {
        const keysList = this.container.querySelector('#mwi-dt-keys-list');
        const keysToggle = this.container.querySelector('#mwi-dt-keys-toggle');

        if (keysList) keysList.style.display = 'block';
        if (keysToggle) keysToggle.textContent = '▲';
    }

    /**
     * Apply keys collapsed state
     */
    applyKeysCollapsedState() {
        const keysList = this.container.querySelector('#mwi-dt-keys-list');
        const keysToggle = this.container.querySelector('#mwi-dt-keys-toggle');

        if (keysList) keysList.style.display = 'none';
        if (keysToggle) keysToggle.textContent = '▼';
    }

    /**
     * Toggle collapse state
     */
    toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;

        if (this.isCollapsed) {
            this.applyCollapsedState();
        } else {
            this.applyExpandedState();
        }

        // If no custom position, update to new default position
        if (!this.position) {
            this.updatePosition();
        } else {
            // Just update width for custom positions
            this.container.style.minWidth = this.isCollapsed ? '250px' : '400px';
        }

        this.saveState();
    }

    /**
     * Apply collapsed state appearance
     */
    applyCollapsedState() {
        const content = this.container.querySelector('#mwi-dt-content');
        const collapseBtn = this.container.querySelector('#mwi-dt-collapse-btn');

        if (content) content.style.display = 'none';
        if (collapseBtn) collapseBtn.textContent = '▲';
    }

    /**
     * Apply expanded state appearance
     */
    applyExpandedState() {
        const content = this.container.querySelector('#mwi-dt-content');
        const collapseBtn = this.container.querySelector('#mwi-dt-collapse-btn');

        if (content) content.style.display = 'flex';
        if (collapseBtn) collapseBtn.textContent = '▼';
    }

    /**
     * Update UI with current run data
     * @param {Object} run - Current run state
     */
    async update(run) {
        if (!run || !this.container) {
            return;
        }

        // Update dungeon name and tier
        const dungeonName = document.getElementById('mwi-dt-dungeon-name');
        if (dungeonName) {
            if (run.dungeonName && run.tier !== null) {
                dungeonName.textContent = `${run.dungeonName} (T${run.tier})`;
            } else {
                dungeonName.textContent = 'Dungeon Loading...';
            }
        }

        // Update wave counter
        const waveCounter = document.getElementById('mwi-dt-wave-counter');
        if (waveCounter && run.maxWaves) {
            waveCounter.textContent = `Wave ${run.currentWave}/${run.maxWaves}`;
        }

        // Update wave percentage
        const wavePercent = document.getElementById('mwi-dt-wave-percent');
        if (wavePercent && run.maxWaves) {
            const percent = Math.round((run.currentWave / run.maxWaves) * 100);
            wavePercent.textContent = `(${percent}%)`;
        }

        // Update progress bar
        const progressBar = document.getElementById('mwi-dt-progress-bar');
        const progressText = document.getElementById('mwi-dt-progress-text');
        if (progressBar && progressText && run.maxWaves) {
            const percent = Math.round((run.currentWave / run.maxWaves) * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
        }

        // Fetch run statistics for this dungeon+tier
        const stats = await dungeonTrackerStorage.getStats(run.dungeonHrid, run.tier);
        const runHistory = await dungeonTrackerStorage.getRunHistory(run.dungeonHrid, run.tier);

        // Update header stats (always visible)
        const headerCurrent = document.getElementById('mwi-dt-header-current');
        if (headerCurrent) {
            headerCurrent.textContent = this.formatTime(run.totalElapsed);
        }

        const headerAvg = document.getElementById('mwi-dt-header-avg');
        if (headerAvg) {
            headerAvg.textContent = stats.avgTime > 0 ? this.formatTime(stats.avgTime) : '--:--';
        }

        const headerRuns = document.getElementById('mwi-dt-header-runs');
        if (headerRuns) {
            headerRuns.textContent = stats.totalRuns.toString();
        }

        // Update run-level stats in content area
        const currentTime = document.getElementById('mwi-dt-current-time');
        if (currentTime) {
            currentTime.textContent = this.formatTime(run.totalElapsed);
        }

        const avgTime = document.getElementById('mwi-dt-avg-time');
        if (avgTime) {
            avgTime.textContent = stats.avgTime > 0 ? this.formatTime(stats.avgTime) : '--:--';
        }

        const fastestTime = document.getElementById('mwi-dt-fastest-time');
        if (fastestTime) {
            fastestTime.textContent = stats.fastestTime > 0 ? this.formatTime(stats.fastestTime) : '--:--';
        }

        const slowestTime = document.getElementById('mwi-dt-slowest-time');
        if (slowestTime) {
            slowestTime.textContent = stats.slowestTime > 0 ? this.formatTime(stats.slowestTime) : '--:--';
        }

        // Update run history list
        this.updateRunHistory(run.dungeonHrid, run.tier, runHistory);
    }

    /**
     * Update run history list
     * @param {string} dungeonHrid - Dungeon action HRID
     * @param {number} tier - Difficulty tier
     * @param {Array} runs - Run history array
     */
    updateRunHistory(dungeonHrid, tier, runs) {
        const runList = document.getElementById('mwi-dt-run-list');
        if (!runList) return;

        if (!runs || runs.length === 0) {
            runList.innerHTML = '<div style="color: #888; font-style: italic; text-align: center; padding: 8px;">No runs yet</div>';
            return;
        }

        // Build run list HTML
        let html = '';
        runs.forEach((run, index) => {
            const runNumber = runs.length - index; // Count down from most recent
            const timeStr = this.formatTime(run.totalTime);

            html += `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 8px;
                    border-bottom: 1px solid #333;
                " data-run-index="${index}">
                    <span style="color: #aaa; min-width: 30px;">#${runNumber}</span>
                    <span style="color: #fff; flex: 1; text-align: center;">${timeStr}</span>
                    <button class="mwi-dt-delete-run" style="
                        background: none;
                        border: 1px solid #ff6b6b;
                        color: #ff6b6b;
                        cursor: pointer;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-weight: bold;
                    " title="Delete this run">✕</button>
                </div>
            `;
        });

        runList.innerHTML = html;

        // Attach delete handlers
        runList.querySelectorAll('.mwi-dt-delete-run').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const runIndex = parseInt(e.target.closest('[data-run-index]').dataset.runIndex);
                await dungeonTrackerStorage.deleteRun(dungeonHrid, tier, runIndex);

                // Refresh display
                const currentRun = dungeonTracker.getCurrentRun();
                if (currentRun) {
                    this.update(currentRun);
                }
            });
        });
    }

    /**
     * Show the UI
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * Hide the UI
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Start the update loop (updates current wave time every second)
     */
    startUpdateLoop() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Update every second
        this.updateInterval = setInterval(() => {
            const currentRun = dungeonTracker.getCurrentRun();
            if (currentRun) {
                this.update(currentRun);
            }
        }, 1000);
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
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Create and export singleton instance
const dungeonTrackerUI = new DungeonTrackerUI();

export default dungeonTrackerUI;
export { DungeonTrackerUI };
