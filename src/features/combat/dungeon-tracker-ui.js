/**
 * Dungeon Tracker UI
 * Displays dungeon progress in the top bar
 */

import dungeonTracker from './dungeon-tracker.js';
import storage from '../../core/storage.js';

class DungeonTrackerUI {
    constructor() {
        this.container = null;
        this.updateInterval = null;
        this.isCollapsed = false;
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
            this.position = savedState.position || null;
        }
    }

    /**
     * Save current state to storage
     */
    async saveState() {
        await storage.setJSON('dungeonTracker_uiState', {
            isCollapsed: this.isCollapsed,
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
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                background: #2d3748;
                border-radius: 6px 6px 0 0;
                cursor: move;
                user-select: none;
            ">
                <span id="mwi-dt-dungeon-name" style="font-weight: bold; font-size: 14px; color: #4a9eff;">
                    Loading...
                </span>
                <div style="display: flex; gap: 8px;">
                    <span id="mwi-dt-total-time" style="font-size: 13px; color: #aaa;">
                        00:00
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
            <div id="mwi-dt-content" style="padding: 12px 20px; display: flex; flex-direction: column; gap: 8px;">
                <!-- Wave counter and percentage -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span id="mwi-dt-wave-counter" style="font-size: 13px;">
                        Wave 1/50
                    </span>
                    <span id="mwi-dt-wave-percent" style="font-size: 13px; color: #4a9eff;">
                        (0%)
                    </span>
                </div>

                <!-- Progress bar -->
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

                <!-- Statistics row -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px; color: #ccc;">
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Current Wave</div>
                        <div id="mwi-dt-current-wave-time" style="color: #fff; font-weight: bold;">00:00</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Avg Wave</div>
                        <div id="mwi-dt-avg-wave-time" style="color: #fff; font-weight: bold;">00:00</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">ETA</div>
                        <div id="mwi-dt-eta" style="color: #4a9eff; font-weight: bold;">--:--</div>
                    </div>
                </div>

                <!-- Fastest/Slowest row -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px; color: #ccc; padding-top: 4px; border-top: 1px solid #444;">
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Fastest</div>
                        <div id="mwi-dt-fastest-wave" style="color: #5fda5f; font-weight: bold;">--:--</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #aaa; font-size: 10px;">Slowest</div>
                        <div id="mwi-dt-slowest-wave" style="color: #ff6b6b; font-weight: bold;">--:--</div>
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

        // Apply initial collapsed state
        if (this.isCollapsed) {
            this.applyCollapsedState();
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
    update(run) {
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

        // Update total time
        const totalTime = document.getElementById('mwi-dt-total-time');
        if (totalTime) {
            totalTime.textContent = this.formatTime(run.totalElapsed);
        }

        // Update wave counter
        const waveCounter = document.getElementById('mwi-dt-wave-counter');
        if (waveCounter && run.maxWaves) {
            const newText = `Wave ${run.currentWave}/${run.maxWaves}`;
            waveCounter.textContent = newText;
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

        // Update current wave time
        const currentWaveTime = document.getElementById('mwi-dt-current-wave-time');
        if (currentWaveTime) {
            currentWaveTime.textContent = this.formatTime(run.currentWaveElapsed);
        }

        // Update average wave time
        const avgWaveTime = document.getElementById('mwi-dt-avg-wave-time');
        if (avgWaveTime) {
            avgWaveTime.textContent = run.avgWaveTime > 0 ? this.formatTime(run.avgWaveTime) : '--:--';
        }

        // Update ETA
        const eta = document.getElementById('mwi-dt-eta');
        if (eta) {
            eta.textContent = run.estimatedTimeRemaining > 0 ? this.formatTime(run.estimatedTimeRemaining) : '--:--';
        }

        // Update fastest wave
        const fastestWave = document.getElementById('mwi-dt-fastest-wave');
        if (fastestWave) {
            fastestWave.textContent = run.fastestWave > 0 ? this.formatTime(run.fastestWave) : '--:--';
        }

        // Update slowest wave
        const slowestWave = document.getElementById('mwi-dt-slowest-wave');
        if (slowestWave) {
            slowestWave.textContent = run.slowestWave > 0 ? this.formatTime(run.slowestWave) : '--:--';
        }
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
