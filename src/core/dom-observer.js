/**
 * Centralized DOM Observer
 * Single MutationObserver that dispatches to registered handlers
 * Replaces 15 separate observers watching document.body
 */

class DOMObserver {
    constructor() {
        this.observer = null;
        this.handlers = [];
        this.isObserving = false;
    }

    /**
     * Start observing DOM changes
     */
    start() {
        if (this.isObserving) return;

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    // Dispatch to all registered handlers
                    this.handlers.forEach(handler => {
                        try {
                            handler.callback(node, mutation);
                        } catch (error) {
                            console.error(`[DOM Observer] Handler error (${handler.name}):`, error);
                        }
                    });
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.isObserving = true;
    }

    /**
     * Stop observing DOM changes
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isObserving = false;
    }

    /**
     * Register a handler for DOM changes
     * @param {string} name - Handler name for debugging
     * @param {Function} callback - Function to call when nodes are added (receives node, mutation)
     * @returns {Function} Unregister function
     */
    register(name, callback) {
        const handler = { name, callback };
        this.handlers.push(handler);

        // Return unregister function
        return () => {
            const index = this.handlers.indexOf(handler);
            if (index > -1) {
                this.handlers.splice(index, 1);
            }
        };
    }

    /**
     * Register a handler for specific class names
     * @param {string} name - Handler name for debugging
     * @param {string|string[]} classNames - Class name(s) to watch for (supports partial matches)
     * @param {Function} callback - Function to call when matching elements appear
     * @returns {Function} Unregister function
     */
    onClass(name, classNames, callback) {
        const classArray = Array.isArray(classNames) ? classNames : [classNames];

        return this.register(name, (node) => {
            // Safely get className as string (handles SVG elements)
            const className = typeof node.className === 'string' ? node.className : '';

            // Check if node matches any of the target classes
            for (const targetClass of classArray) {
                if (className.includes(targetClass)) {
                    callback(node);
                    return; // Only call once per node
                }
            }

            // Also check if node contains matching elements
            if (node.querySelector) {
                for (const targetClass of classArray) {
                    const matches = node.querySelectorAll(`[class*="${targetClass}"]`);
                    matches.forEach(match => callback(match));
                }
            }
        });
    }

    /**
     * Get stats about registered handlers
     */
    getStats() {
        return {
            isObserving: this.isObserving,
            handlerCount: this.handlers.length,
            handlers: this.handlers.map(h => h.name)
        };
    }
}

// Create singleton instance
const domObserver = new DOMObserver();

export default domObserver;
