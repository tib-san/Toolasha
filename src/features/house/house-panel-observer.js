/**
 * House Panel Observer
 * Detects house upgrade modal and injects cost displays
 */

import domObserver from '../../core/dom-observer.js';
import houseCostCalculator from './house-cost-calculator.js';
import houseCostDisplay from './house-cost-display.js';
import dataManager from '../../core/data-manager.js';

class HousePanelObserver {
    constructor() {
        this.isActive = false;
        this.unregisterHandlers = [];
        this.processedCards = new WeakSet();
    }

    /**
     * Initialize the observer
     */
    async initialize() {
        if (this.isActive) return;

        // Initialize calculator
        await houseCostCalculator.initialize();

        // Initialize display
        houseCostDisplay.initialize();

        // Register modal observer
        this.registerObservers();

        this.isActive = true;
    }

    /**
     * Register DOM observers
     */
    registerObservers() {
        // Watch for house modal appearing
        const unregisterModal = domObserver.onClass(
            'HousePanelObserver-Modal',
            'HousePanel_modalContent',
            (modalContent) => {
                this.handleHouseModal(modalContent);
            }
        );
        this.unregisterHandlers.push(unregisterModal);
    }

    /**
     * Handle house modal appearing
     * @param {Element} modalContent - The house panel modal content element
     */
    async handleHouseModal(modalContent) {
        // Wait a moment for content to fully load
        await new Promise(resolve => setTimeout(resolve, 100));

        // Find all house room cards
        const roomCards = this.findHouseRoomCards(modalContent);

        for (const card of roomCards) {
            await this.processRoomCard(card);
        }

        // Set up observer for dynamically added/updated cards
        this.observeRoomCards(modalContent);
    }

    /**
     * Find all house room cards in the modal
     * @param {Element} modalContent - The house panel modal content
     * @returns {Array<Element>} Array of room card elements
     */
    findHouseRoomCards(modalContent) {
        // House rooms are typically in a grid/list structure
        // Look for common patterns: HouseRoom_, Room_, or similar
        const selectors = [
            '[class*="HouseRoom_"]',
            '[class*="houseRoom"]',
            '[class*="RoomCard_"]'
        ];

        for (const selector of selectors) {
            const cards = modalContent.querySelectorAll(selector);
            if (cards.length > 0) {
                // Filter to direct children or specific depth to avoid nested elements
                return Array.from(cards).filter(card => {
                    // Basic check: should contain room information
                    return card.textContent.length > 10; // Has substantial content
                });
            }
        }

        // Fallback: if we can't find specific room cards, try looking for upgrade buttons
        // and work backwards to find their parent cards
        const upgradeButtons = modalContent.querySelectorAll('[class*="upgrade"]');
        if (upgradeButtons.length > 0) {
            return Array.from(upgradeButtons).map(btn => {
                // Find the parent card (usually 2-3 levels up)
                let parent = btn.parentElement;
                let depth = 0;
                while (parent && depth < 5) {
                    const className = parent.className || '';
                    if (className.includes('Room') || className.includes('Card')) {
                        return parent;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
                return btn.closest('[class*="Room"]') || btn.parentElement;
            }).filter((card, index, self) => {
                // Remove duplicates
                return card && self.indexOf(card) === index;
            });
        }

        console.warn('[House Panel Observer] Could not find house room cards');
        return [];
    }

    /**
     * Process a single room card
     * @param {Element} card - The room card element
     */
    async processRoomCard(card) {
        // Skip if already processed
        if (this.processedCards.has(card)) {
            return;
        }

        this.processedCards.add(card);

        // Try to identify which house room this is
        const houseRoomHrid = this.identifyRoomFromCard(card);

        if (!houseRoomHrid) {
            console.warn('[House Panel Observer] Could not identify room from card:', card);
            return;
        }

        // Add cost display
        await houseCostDisplay.addCostDisplay(card, houseRoomHrid);
    }

    /**
     * Identify house room HRID from card element
     * @param {Element} card - The room card element
     * @returns {string|null} House room HRID
     */
    identifyRoomFromCard(card) {
        const initData = dataManager.getInitClientData();
        if (!initData || !initData.houseRoomDetailMap) {
            return null;
        }

        // Get text content from card
        const cardText = card.textContent;

        // Try to match room name
        for (const [hrid, roomData] of Object.entries(initData.houseRoomDetailMap)) {
            if (cardText.includes(roomData.name)) {
                return hrid;
            }
        }

        // Alternative: look for skill names (each room is associated with a skill)
        const skillMap = {
            'Brewing': '/house_rooms/brewery',
            'Cooking': '/house_rooms/kitchen',
            'Crafting': '/house_rooms/workshop',
            'Tailoring': '/house_rooms/sewing_parlor',
            'Cheesesmithing': '/house_rooms/forge',
            'Milking': '/house_rooms/dairy_barn',
            'Foraging': '/house_rooms/garden',
            'Woodcutting': '/house_rooms/log_shed',
            'Alchemy': '/house_rooms/laboratory',
            'Enhancing': '/house_rooms/observatory',
            'Attack': '/house_rooms/dojo',
            'Defense': '/house_rooms/armory',
            'Magic': '/house_rooms/mystical_study',
            'Melee': '/house_rooms/gym',
            'Ranged': '/house_rooms/archery_range',
            'Stamina': '/house_rooms/dining_room',
            'Intelligence': '/house_rooms/library'
        };

        for (const [skillName, hrid] of Object.entries(skillMap)) {
            if (cardText.includes(skillName)) {
                return hrid;
            }
        }

        return null;
    }

    /**
     * Observe room cards for dynamic updates
     * @param {Element} modalContent - The house panel modal content
     */
    observeRoomCards(modalContent) {
        const observer = new MutationObserver(() => {
            const roomCards = this.findHouseRoomCards(modalContent);
            for (const card of roomCards) {
                if (!this.processedCards.has(card)) {
                    this.processRoomCard(card);
                }
            }
        });

        observer.observe(modalContent, {
            childList: true,
            subtree: true
        });

        // Store observer for cleanup
        if (!this.modalObservers) {
            this.modalObservers = [];
        }
        this.modalObservers.push(observer);
    }

    /**
     * Clean up observers
     */
    cleanup() {
        this.unregisterHandlers.forEach(unregister => unregister());
        this.unregisterHandlers = [];

        if (this.modalObservers) {
            this.modalObservers.forEach(observer => observer.disconnect());
            this.modalObservers = [];
        }

        this.processedCards = new WeakSet();
        this.isActive = false;
    }
}

// Create and export singleton instance
const housePanelObserver = new HousePanelObserver();

export default housePanelObserver;
