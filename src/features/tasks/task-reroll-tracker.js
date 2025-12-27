/**
 * Task Reroll Cost Tracker
 * Tracks and displays reroll costs for tasks
 */

import { numberFormatter } from '../../utils/formatters.js';
import config from '../../core/config.js';

class TaskRerollTracker {
    constructor() {
        this.rerollSpending = new Map(); // key: slotIndex, value: { goldSpent: total, cowbellSpent: total }
        this.observer = null;
        this.isInitialized = false;
        this.isUpdatingAllDisplays = false; // Guard flag to prevent double updates
    }

    /**
     * Initialize the tracker
     */
    initialize() {
        if (this.isInitialized) return;

        // Load saved spending data from localStorage
        this.loadFromLocalStorage();

        // Start observing for reroll UI
        this.startObserver();

        // Add initial displays to existing tasks
        this.updateAllTaskDisplays();

        // Attach listeners to any reroll containers already in the DOM
        this.attachExistingRerollListeners();

        this.isInitialized = true;
    }

    /**
     * Attach listeners to reroll containers already in DOM at initialization
     */
    attachExistingRerollListeners() {
        const rerollContainers = document.querySelectorAll('[class*="rerollOptionsContainer"]');
        rerollContainers.forEach(container => {
            this.handleRerollOptionsAppeared(container);
        });
    }

    /**
     * Load spending data from localStorage
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('mwi_reroll_spending');
            if (saved) {
                const data = JSON.parse(saved);
                this.rerollSpending = new Map(data);
            }
        } catch (error) {
            console.error('[Task Reroll Tracker] Failed to load from localStorage:', error);
            this.rerollSpending = new Map();
        }
    }

    /**
     * Save spending data to localStorage
     */
    saveToLocalStorage() {
        try {
            const data = Array.from(this.rerollSpending.entries());
            localStorage.setItem('mwi_reroll_spending', JSON.stringify(data));
        } catch (error) {
            console.error('[Task Reroll Tracker] Failed to save to localStorage:', error);
        }
    }

    /**
     * Start DOM observer to watch for reroll actions
     */
    startObserver() {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    // Safely get className as string (handles SVG elements)
                    const className = typeof node.className === 'string' ? node.className : '';

                    // Check if task list appeared (user navigated to tasks panel)
                    if (className.includes('TasksPanel_taskList')) {
                        this.updateAllTaskDisplays();
                    }

                    // Check if reroll options container appeared
                    if (className.includes('rerollOptionsContainer')) {
                        this.handleRerollOptionsAppeared(node);
                    }

                    // Check if it's a parent containing task list or reroll options
                    if (node.querySelector) {
                        const taskList = node.querySelector('[class*="TasksPanel_taskList"]');
                        if (taskList) {
                            this.updateAllTaskDisplays();
                        }

                        const rerollContainer = node.querySelector('[class*="rerollOptionsContainer"]');
                        if (rerollContainer) {
                            this.handleRerollOptionsAppeared(rerollContainer);
                        }
                    }
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Handle reroll options container appearing
     */
    handleRerollOptionsAppeared(container) {
        // Find which task this belongs to
        const taskElement = container.closest('[class*="RandomTask_randomTask"]');
        if (!taskElement) return;

        const slotIndex = this.getTaskSlotIndex(taskElement);
        if (slotIndex === -1) return;

        // Attach click listeners to payment buttons
        this.attachPaymentListeners(container, slotIndex);

        // Update display
        this.updateTaskDisplay(taskElement, slotIndex);
    }

    /**
     * Get currency type from button SVG icon
     * @param {Element} button - Button element
     * @returns {string|null} 'gold', 'cowbell', or null
     */
    getCurrencyFromButton(button) {
        const svg = button.querySelector('svg use');
        const href = svg ? svg.getAttribute('href') : null;
        if (!href) return null;

        if (href.includes('cowbell')) return 'cowbell';
        if (href.includes('coin') || href.includes('gold')) return 'gold';
        return null;
    }

    /**
     * Attach click listeners to payment buttons
     */
    attachPaymentListeners(container, slotIndex) {
        const buttons = container.querySelectorAll('button');

        buttons.forEach(button => {
            const currency = this.getCurrencyFromButton(button);
            if (!currency) return;

            // Note: Not using { once: true } because the reroll container is reused (hidden/shown)
            // rather than removed/recreated, so we need persistent listeners
            button.addEventListener('click', () => {
                // Parse cost from button at click time (not when listener attached)
                // because the cost changes each reroll (1→2→4→8...)
                const buttonText = button.textContent || '';
                const costMatch = buttonText.match(/(\d+)/);
                const cost = costMatch ? parseInt(costMatch[1]) : null;

                if (!cost) return;

                setTimeout(() => {
                    // Record spending
                    this.recordSpending(slotIndex, currency, cost);

                    // Update display immediately
                    const taskElement = container.closest('[class*="RandomTask_randomTask"]');
                    if (taskElement) {
                        this.updateTaskDisplay(taskElement, slotIndex);
                    }
                }, 100);
            });
        });
    }

    /**
     * Record spending for a slot
     */
    recordSpending(slotIndex, currency, cost) {
        if (!this.rerollSpending.has(slotIndex)) {
            this.rerollSpending.set(slotIndex, { goldSpent: 0, cowbellSpent: 0 });
        }

        const spending = this.rerollSpending.get(slotIndex);
        if (currency === 'gold') {
            spending.goldSpent += cost;
        } else if (currency === 'cowbell') {
            spending.cowbellSpent += cost;
        }

        // Save to localStorage after recording
        this.saveToLocalStorage();
    }

    /**
     * Get task slot index from DOM position
     */
    getTaskSlotIndex(taskElement) {
        const taskList = document.querySelector('[class*="TasksPanel_taskList"]');
        if (!taskList) return -1;

        const allTasks = Array.from(taskList.querySelectorAll('[class*="RandomTask_randomTask"]'));
        return allTasks.indexOf(taskElement);
    }

    /**
     * Update display for a specific task
     */
    updateTaskDisplay(taskElement, slotIndex) {
        // Get spending totals
        const spending = this.rerollSpending.get(slotIndex) || { goldSpent: 0, cowbellSpent: 0 };

        // Find or create display element
        let displayElement = taskElement.querySelector('.mwi-reroll-cost-display');

        if (!displayElement) {
            displayElement = document.createElement('div');
            displayElement.className = 'mwi-reroll-cost-display';
            displayElement.style.cssText = `
                color: ${config.SCRIPT_COLOR_SECONDARY};
                font-size: 0.75rem;
                margin-top: 4px;
                padding: 2px 4px;
                border-radius: 3px;
                background: rgba(0, 0, 0, 0.3);
            `;

            // Insert at top of task card
            const taskContent = taskElement.querySelector('[class*="RandomTask_content"]');
            if (taskContent) {
                taskContent.insertBefore(displayElement, taskContent.firstChild);
            } else {
                taskElement.insertBefore(displayElement, taskElement.firstChild);
            }
        }

        // Format display text - show total spent
        const parts = [];
        if (spending.cowbellSpent > 0) {
            parts.push(`${spending.cowbellSpent}🔔`);
        }
        if (spending.goldSpent > 0) {
            parts.push(`${numberFormatter(spending.goldSpent)}💰`);
        }

        if (parts.length > 0) {
            displayElement.textContent = `Reroll spent: ${parts.join(' + ')}`;
            displayElement.style.display = 'block';
        } else {
            displayElement.style.display = 'none';
        }
    }

    /**
     * Update all task displays
     */
    updateAllTaskDisplays() {
        // Guard against double execution
        if (this.isUpdatingAllDisplays) return;
        this.isUpdatingAllDisplays = true;

        const taskList = document.querySelector('[class*="TasksPanel_taskList"]');
        if (taskList) {
            const allTasks = taskList.querySelectorAll('[class*="RandomTask_randomTask"]');
            allTasks.forEach((task, index) => {
                this.updateTaskDisplay(task, index);
            });
        }

        this.isUpdatingAllDisplays = false;
    }

    /**
     * Reset reroll spending for a task slot
     */
    resetSlot(slotIndex) {
        this.rerollSpending.delete(slotIndex);
        this.saveToLocalStorage();
    }

    /**
     * Reset all reroll spending
     */
    resetAll() {
        this.rerollSpending.clear();
        this.saveToLocalStorage();
        this.updateAllTaskDisplays();
    }
}

// Create singleton instance
const taskRerollTracker = new TaskRerollTracker();

export default taskRerollTracker;
