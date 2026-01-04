/**
 * Output Totals Display Module
 *
 * Shows total expected outputs below per-action outputs when user enters
 * a quantity in the action input box.
 *
 * Example:
 * - Game shows: "Outputs: 1.3 - 3.9 Flax"
 * - User enters: 100 actions
 * - Module shows: "130.0 - 390.0" below the per-action output
 */

import domObserver from '../../core/dom-observer.js';
import config from '../../core/config.js';

class OutputTotals {
    constructor() {
        this.observedInputs = new Map(); // input element → cleanup function
        this.unregisterObserver = null;
    }

    /**
     * Initialize the output totals display
     */
    initialize() {
        if (!config.getSetting('actionPanel_outputTotals')) {
            return;
        }

        this.setupObserver();
    }

    /**
     * Setup DOM observer to watch for action detail panels
     */
    setupObserver() {
        // Watch for action detail panels appearing
        // The game shows action details when you click an action
        this.unregisterObserver = domObserver.onClass(
            'OutputTotals',
            'SkillActionDetail_skillActionDetail',
            (detailPanel) => {
                this.attachToActionPanel(detailPanel);
            }
        );
    }

    /**
     * Attach input listener to an action panel
     * @param {HTMLElement} detailPanel - The action detail panel element
     */
    attachToActionPanel(detailPanel) {
        // Find the input box - same approach as MWIT-E
        const inputContainer = detailPanel.querySelector('[class*="maxActionCountInput"]');
        if (!inputContainer) {
            return;
        }

        const inputBox = inputContainer.querySelector('input');
        if (!inputBox) {
            return;
        }

        // Avoid duplicate observers
        if (this.observedInputs.has(inputBox)) {
            return;
        }

        // Add keyup listener (same as MWIT-E)
        const updateHandler = () => {
            this.updateOutputTotals(detailPanel, inputBox);
        };

        inputBox.addEventListener('keyup', updateHandler);

        // Also listen to clicks on the panel (for button clicks)
        const panelClickHandler = () => {
            setTimeout(() => {
                this.updateOutputTotals(detailPanel, inputBox);
            }, 50);
        };
        detailPanel.addEventListener('click', panelClickHandler);

        // Store cleanup function
        this.observedInputs.set(inputBox, () => {
            inputBox.removeEventListener('keyup', updateHandler);
            detailPanel.removeEventListener('click', panelClickHandler);
        });

        // Initial update if there's already a value
        if (inputBox.value && inputBox.value > 0) {
            this.updateOutputTotals(detailPanel, inputBox);
        }
    }

    /**
     * Update output totals based on input value
     * @param {HTMLElement} detailPanel - The action detail panel
     * @param {HTMLInputElement} inputBox - The action count input
     */
    updateOutputTotals(detailPanel, inputBox) {
        const amount = parseFloat(inputBox.value);

        // Remove existing totals (cloned outputs)
        detailPanel.querySelectorAll('.mwi-output-total').forEach(el => el.remove());

        // No amount entered - nothing to calculate
        if (isNaN(amount) || amount <= 0) {
            return;
        }

        // Find main drop container (same as MWIT-E approach)
        let dropTable = detailPanel.querySelector('[class*="SkillActionDetail_dropTable"]');
        if (!dropTable) return;

        const outputItems = detailPanel.querySelector('[class*="SkillActionDetail_outputItems"]');
        if (outputItems) dropTable = outputItems;

        console.log('[Output Totals] Found main dropTable');

        // Process main outputs
        this.processDropContainer(dropTable, amount);

        // Process Essences (same as MWIT-E)
        // Look for items with "essence" in the text
        const essenceItems = dropTable.querySelectorAll('[class*="drop"], [class*="Item"]');
        const processedEssences = new Set();

        essenceItems.forEach(item => {
            if (item.innerText.toLowerCase().includes('essence')) {
                const parent = item.closest('[class*="SkillActionDetail"]');
                if (parent && !processedEssences.has(parent) && !parent.querySelector('.cloned-output')) {
                    console.log('[Output Totals] Found essence container:', parent.innerText.substring(0, 50));
                    this.processDropContainer(parent.parentElement, amount);
                    processedEssences.add(parent);
                }
            }
        });

        // Process Rares (same as MWIT-E)
        // Look for items with low drop rates
        const rareItems = dropTable.querySelectorAll('[class*="drop"], [class*="Item"]');
        const processedRares = new Set();

        rareItems.forEach(item => {
            if (item.innerText.includes('%') && !item.innerText.toLowerCase().includes('essence')) {
                const percentage = item.innerText.match(/([\d\.]+)%/);
                if (percentage && parseFloat(percentage[1]) < 5) {
                    const parent = item.closest('[class*="SkillActionDetail"]');
                    if (parent && !processedRares.has(parent) && !parent.querySelector('.cloned-output')) {
                        console.log('[Output Totals] Found rare container:', parent.innerText.substring(0, 50));
                        this.processDropContainer(parent.parentElement, amount);
                        processedRares.add(parent);
                    }
                }
            }
        });
    }

    /**
     * Process drop container (matches MWIT-E implementation)
     * @param {HTMLElement} container - The drop table container
     * @param {number} amount - Number of actions
     */
    processDropContainer(container, amount) {
        if (!container) return;

        const children = Array.from(container.children);
        console.log('[Output Totals] Processing container with', children.length, 'children');

        children.forEach((child, index) => {
            console.log(`[Output Totals] Child ${index}:`, child.className, 'text:', child.innerText?.substring(0, 50));

            // Check if this child has multiple drop elements
            const hasDropElements = child.children.length > 1 &&
                                   child.querySelector('[class*="SkillActionDetail_drop"]');

            console.log(`[Output Totals] Child ${index} hasDropElements:`, hasDropElements);

            if (hasDropElements) {
                // Process multiple drop elements (typical for outputs/essences/rares)
                const dropElements = child.querySelectorAll('[class*="SkillActionDetail_drop"]');
                console.log(`[Output Totals] Found ${dropElements.length} drop elements`);
                dropElements.forEach(dropEl => {
                    const clone = this.processChildElement(dropEl, amount);
                    if (clone) {
                        dropEl.after(clone);
                    }
                });
            } else {
                // Process single element
                console.log(`[Output Totals] Processing child ${index} as single element`);
                const clone = this.processChildElement(child, amount);
                if (clone) {
                    console.log(`[Output Totals] Created clone for child ${index}`);
                    child.parentNode.insertBefore(clone, child.nextSibling);
                } else {
                    console.log(`[Output Totals] No clone created for child ${index}`);
                }
            }
        });
    }

    /**
     * Process a single child element and return clone with calculated total
     * @param {HTMLElement} child - The child element to process
     * @param {number} amount - Number of actions
     * @returns {HTMLElement|null} Clone element or null
     */
    processChildElement(child, amount) {
        console.log('[Output Totals] processChildElement called, child:', child.className);
        console.log('[Output Totals] child.children[0]:', child.children[0]);
        console.log('[Output Totals] child.children[0]?.innerText:', child.children[0]?.innerText);

        // Look for output element (first child with numbers or ranges)
        const hasRange = child.children[0]?.innerText?.includes('-');
        const hasNumbers = child.children[0]?.innerText?.match(/[\d\.]+/);
        console.log('[Output Totals] hasRange:', hasRange, 'hasNumbers:', hasNumbers);

        const outputElement = (hasRange || hasNumbers) ? child.children[0] : null;

        console.log('[Output Totals] outputElement:', outputElement);

        if (!outputElement) return null;

        // Extract drop rate from the child's text
        const dropRateText = child.innerText;
        const rateMatch = dropRateText.match(/~?([\d\.]+)%/);
        const dropRate = rateMatch ? parseFloat(rateMatch[1]) / 100 : 1; // Default to 100%

        // Parse output values
        const output = outputElement.innerText.split('-');

        // Create styled clone (same as MWIT-E)
        const clone = outputElement.cloneNode(true);
        clone.classList.add('mwi-output-total');

        // Determine color based on item type
        let color = config.COLOR_INFO; // Default gold for outputs
        if (child.innerText.toLowerCase().includes('essence')) {
            color = '#9D4EDD'; // Purple for essences
        } else if (dropRate < 0.05 && dropRate < 1) {
            color = config.COLOR_WARNING; // Orange for rares (< 5% drop)
        }

        clone.style.cssText = `
            color: ${color};
            text-shadow: 0 0 6px ${color === '#9D4EDD' ? 'rgba(157, 78, 221, 0.6)' : 'rgba(96, 165, 250, 0.6)'};
            font-weight: 600;
            margin-top: 2px;
        `;

        // Calculate and set the expected output
        if (output.length > 1) {
            // Range output (e.g., "1.3 - 4")
            const minOutput = parseFloat(output[0].trim());
            const maxOutput = parseFloat(output[1].trim());
            const expectedMin = (minOutput * amount * dropRate).toFixed(1);
            const expectedMax = (maxOutput * amount * dropRate).toFixed(1);
            clone.innerText = `${expectedMin} - ${expectedMax}`;
        } else {
            // Single value output
            const value = parseFloat(output[0].trim());
            const expectedValue = (value * amount * dropRate).toFixed(1);
            clone.innerText = `${expectedValue}`;
        }

        return clone;
    }

    /**
     * Disable the output totals display
     */
    disable() {
        // Clean up all input observers
        for (const cleanup of this.observedInputs.values()) {
            cleanup();
        }
        this.observedInputs.clear();

        // Unregister DOM observer
        if (this.unregisterObserver) {
            this.unregisterObserver();
            this.unregisterObserver = null;
        }

        // Remove all injected elements
        document.querySelectorAll('.mwi-output-total').forEach(el => el.remove());
    }
}

// Create and export singleton instance
const outputTotals = new OutputTotals();

export default outputTotals;
