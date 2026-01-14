/**
 * Estimated Listing Age Module
 *
 * Estimates creation times for all market listings using listing ID interpolation
 * - Collects known listing IDs with timestamps (from your own listings)
 * - Uses linear interpolation/regression to estimate ages for unknown listings
 * - Displays estimated ages on the main Market Listings (order book) tab
 */

import dataManager from '../../core/data-manager.js';
import domObserver from '../../core/dom-observer.js';
import config from '../../core/config.js';
import webSocketHook from '../../core/websocket.js';
import storage from '../../core/storage.js';
import { formatRelativeTime } from '../../utils/formatters.js';

class EstimatedListingAge {
    constructor() {
        this.knownListings = []; // Array of {id, timestamp} sorted by id
        this.unregisterWebSocket = null;
        this.unregisterObserver = null;
        this.storageKey = 'marketListingTimestamps';
        this.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    }

    /**
     * Format timestamp based on user settings
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {string} Formatted time string
     */
    formatTimestamp(timestamp) {
        const ageFormat = config.getSettingValue('market_listingAgeFormat', 'datetime');

        if (ageFormat === 'elapsed') {
            // Show elapsed time (e.g., "3h 45m")
            const ageMs = Date.now() - timestamp;
            return formatRelativeTime(ageMs);
        } else {
            // Show date/time (e.g., "01-13 14:30" or "01-13 2:30 PM")
            const timeFormat = config.getSettingValue('market_listingTimeFormat', '24hour');
            const use12Hour = timeFormat === '12hour';

            const date = new Date(timestamp);
            const formatted = date.toLocaleString('en-US', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: use12Hour
            }).replace(/\//g, '-').replace(',', '');

            return formatted;
        }
    }

    /**
     * Initialize the estimated listing age feature
     */
    async initialize() {
        if (!config.getSetting('market_showEstimatedListingAge')) {
            return;
        }

        // Load historical data from storage
        await this.loadHistoricalData();

        // Load initial listings from dataManager
        this.loadInitialListings();

        // Setup WebSocket listeners to collect your listing IDs
        this.setupWebSocketListeners();

        // Setup DOM observer for order book table
        this.setupObserver();
    }

    /**
     * Load initial listings from dataManager (already received via init_character_data)
     */
    loadInitialListings() {
        const listings = dataManager.getMarketListings();

        console.log('[EstimatedListingAge] Loading initial listings from dataManager:', listings);

        for (const listing of listings) {
            if (listing.id && listing.createdTimestamp) {
                this.recordListing(listing);
            }
        }

        console.log(`[EstimatedListingAge] Loaded ${listings.length} initial listings from dataManager`);
    }

    /**
     * Load historical listing data from IndexedDB
     */
    async loadHistoricalData() {
        try {
            const stored = await storage.getJSON(this.storageKey, 'marketListings', []);

            console.log('[EstimatedListingAge] Raw stored data:', stored);

            // Filter out old entries (> 30 days)
            const now = Date.now();
            const filtered = stored.filter(entry => (now - entry.timestamp) < this.maxAge);

            this.knownListings = filtered.sort((a, b) => a.id - b.id);

            // Save cleaned data back if we filtered anything
            if (filtered.length < stored.length) {
                await this.saveHistoricalData();
            }

            console.log(`[EstimatedListingAge] Loaded ${this.knownListings.length} historical listings`);
            if (this.knownListings.length > 0) {
                console.log('[EstimatedListingAge] Sample listing:', this.knownListings[0]);
            }
        } catch (error) {
            console.error('[EstimatedListingAge] Failed to load historical data:', error);
            this.knownListings = [];
        }
    }

    /**
     * Save listing data to IndexedDB
     */
    async saveHistoricalData() {
        try {
            await storage.setJSON(this.storageKey, this.knownListings, 'marketListings', true);
        } catch (error) {
            console.error('[EstimatedListingAge] Failed to save historical data:', error);
        }
    }

    /**
     * Setup WebSocket listeners to collect your listing IDs
     */
    setupWebSocketListeners() {
        // Handle initial character data
        const initHandler = (data) => {
            if (data.myMarketListings) {
                for (const listing of data.myMarketListings) {
                    this.recordListing(listing);
                }
            }
        };

        // Handle listing updates
        const updateHandler = (data) => {
            if (data.endMarketListings) {
                for (const listing of data.endMarketListings) {
                    this.recordListing(listing);
                }
            }
        };

        webSocketHook.on('init_character_data', initHandler);
        webSocketHook.on('market_listings_updated', updateHandler);

        // Store for cleanup
        this.unregisterWebSocket = () => {
            webSocketHook.off('init_character_data', initHandler);
            webSocketHook.off('market_listings_updated', updateHandler);
        };
    }

    /**
     * Record a listing with its full data
     * @param {Object} listing - Full listing object from WebSocket
     */
    recordListing(listing) {
        // DEBUG: Log the incoming listing structure
        console.log('[EstimatedListingAge] recordListing called with:', listing);

        if (!listing.createdTimestamp) {
            console.warn('[EstimatedListingAge] No createdTimestamp on listing:', listing);
            return;
        }

        const timestamp = new Date(listing.createdTimestamp).getTime();

        // Check if we already have this listing
        const existingIndex = this.knownListings.findIndex(entry => entry.id === listing.id);

        // Add new entry with full data
        const entry = {
            id: listing.id,
            timestamp: timestamp,
            itemHrid: listing.itemHrid,
            price: listing.price,
            orderQuantity: listing.orderQuantity,
            filledQuantity: listing.filledQuantity,
            isSell: listing.isSell
        };

        if (existingIndex !== -1) {
            // Update existing entry (in case it had incomplete data)
            console.log('[EstimatedListingAge] Updating existing entry:', entry);
            this.knownListings[existingIndex] = entry;
        } else {
            // Add new entry
            console.log('[EstimatedListingAge] Adding new entry:', entry);
            this.knownListings.push(entry);
        }

        // Re-sort by ID
        this.knownListings.sort((a, b) => a.id - b.id);

        // Save to storage (debounced)
        this.saveHistoricalData();
    }

    /**
     * Setup DOM observer to watch for order book table
     */
    setupObserver() {
        // Observe the main order book container
        this.unregisterObserver = domObserver.onClass(
            'EstimatedListingAge',
            'MarketplacePanel_orderBooksContainer',
            (container) => {
                this.processOrderBook(container);
            }
        );
    }

    /**
     * Process the order book container and inject age estimates
     * @param {HTMLElement} container - Order book container
     */
    processOrderBook(container) {
        // Skip if already processed
        if (container.classList.contains('mwi-estimated-age-set')) {
            return;
        }

        // Find the buy and sell tables
        const tables = container.querySelectorAll('table');
        if (tables.length < 2) {
            return; // Need both buy and sell tables
        }

        // Mark as processed
        container.classList.add('mwi-estimated-age-set');

        // Process both tables
        tables.forEach(table => this.addAgeColumn(table));
    }

    /**
     * Add estimated age column to order book table
     * @param {HTMLElement} table - Order book table
     */
    addAgeColumn(table) {
        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');

        if (!thead || !tbody) {
            return;
        }

        // Try to detect which item we're viewing by checking the container
        const currentItemHrid = this.getCurrentItemHrid();

        // Add header
        const header = document.createElement('th');
        header.classList.add('mwi-estimated-age-header');
        header.textContent = '~Age';
        header.title = 'Estimated listing age (based on listing ID)';
        thead.appendChild(header);

        // Add age cells to each row
        const rows = tbody.querySelectorAll('tr');
        let yourListingIndex = 0; // Track position among YOUR listings

        rows.forEach(row => {
            const cell = document.createElement('td');
            cell.classList.add('mwi-estimated-age-cell');

            // Check if this is YOUR listing (has Cancel button)
            const hasCancel = row.textContent.includes('Cancel');

            if (hasCancel && currentItemHrid) {
                // Try to match your listing by item + price + quantity
                const priceText = row.querySelector('[class*="price"]')?.textContent || '';
                const quantityText = row.children[0]?.textContent || '';

                // Parse price (handles K/M suffixes)
                let price = this.parsePrice(priceText);
                let quantity = this.parseQuantity(quantityText);

                // DEBUG: Log matching attempt
                console.log('[EstimatedListingAge] Matching attempt:', {
                    currentItemHrid,
                    priceText,
                    quantityText,
                    parsedPrice: price,
                    parsedQuantity: quantity,
                    yourListingIndex,
                    totalKnownListings: this.knownListings.length
                });

                // Find ALL matching listings (may be multiple with same item+price+quantity)
                const matchingListings = this.knownListings.filter(listing => {
                    const itemMatch = listing.itemHrid === currentItemHrid;
                    const priceMatch = Math.abs(listing.price - price) < 0.01;
                    const qtyMatch = (listing.orderQuantity - listing.filledQuantity) === quantity;

                    // DEBUG: Log each listing check
                    if (!itemMatch || !priceMatch || !qtyMatch) {
                        console.log('[EstimatedListingAge] Listing rejected:', {
                            listingItem: listing.itemHrid,
                            listingPrice: listing.price,
                            listingQty: listing.orderQuantity - listing.filledQuantity,
                            itemMatch,
                            priceMatch,
                            qtyMatch
                        });
                    }

                    return itemMatch && priceMatch && qtyMatch;
                });

                console.log('[EstimatedListingAge] Found matches:', matchingListings.length);

                // Sort by timestamp (oldest first, matching game order)
                matchingListings.sort((a, b) => a.timestamp - b.timestamp);

                // Use row index to pick the correct listing
                const matchedListing = matchingListings[yourListingIndex];

                if (matchedListing) {
                    // Format based on user settings
                    const formatted = this.formatTimestamp(matchedListing.timestamp);

                    cell.textContent = formatted; // No tilde for exact timestamps
                    cell.style.color = '#00FF00'; // Green for YOUR listing
                    cell.style.fontSize = '0.9em';
                } else {
                    cell.textContent = '~Unknown';
                    cell.style.color = '#666666';
                    cell.style.fontSize = '0.9em';
                }

                yourListingIndex++; // Increment for next YOUR listing with same criteria
            } else {
                // Not your listing - try estimation by listing ID
                const listingId = this.extractListingId(row);
                if (listingId) {
                    const estimatedTimestamp = this.estimateTimestamp(listingId);

                    // Format based on user settings, with tilde prefix for estimates
                    const formatted = this.formatTimestamp(estimatedTimestamp);

                    cell.textContent = `~${formatted}`;
                    cell.style.color = '#999999'; // Gray to indicate estimate
                    cell.style.fontSize = '0.9em';
                } else {
                    cell.textContent = '~Unknown';
                    cell.style.color = '#666666';
                    cell.style.fontSize = '0.9em';
                }
            }

            row.appendChild(cell);
        });
    }

    /**
     * Get current item HRID being viewed in order book
     * @returns {string|null} Item HRID or null
     */
    getCurrentItemHrid() {
        // Find the order book container
        const orderBookContainer = document.querySelector('[class*="MarketplacePanel_orderBooksContainer"]');
        if (!orderBookContainer) {
            console.log('[EstimatedListingAge] No order book container found');
            return null;
        }

        // Go up to the PARENT MarketplacePanel (not the orderBooksContainer itself)
        const marketPanel = orderBookContainer.parentElement;
        if (!marketPanel) {
            console.log('[EstimatedListingAge] No parent market panel found');
            return null;
        }

        // Debug: log the market panel structure
        console.log('[EstimatedListingAge] Market panel:', marketPanel);
        console.log('[EstimatedListingAge] Market panel class:', marketPanel.className);
        console.log('[EstimatedListingAge] Market panel children:', Array.from(marketPanel.children).map(el => el.className));

        // Try to find the current item from YOUR listings
        // Since the game doesn't expose the current item in the order book panel,
        // we'll match your listing from the order book against stored data
        console.log('[EstimatedListingAge] Attempting to detect item from YOUR listings...');

        const tables = orderBookContainer.querySelectorAll('table');
        for (const table of tables) {
            const rows = table.querySelectorAll('tbody tr');
            for (const row of rows) {
                const hasCancel = row.textContent.includes('Cancel');
                if (hasCancel) {
                    const priceText = row.querySelector('[class*="price"]')?.textContent || '';
                    const quantityText = row.children[0]?.textContent || '';

                    const price = this.parsePrice(priceText);
                    const quantity = this.parseQuantity(quantityText);

                    console.log('[EstimatedListingAge] Found YOUR listing:', { price, quantity });

                    // Match against stored listings
                    for (const listing of this.knownListings) {
                        const priceMatch = Math.abs(listing.price - price) < 0.01;
                        const qtyMatch = (listing.orderQuantity - listing.filledQuantity) === quantity;

                        if (priceMatch && qtyMatch) {
                            console.log('[EstimatedListingAge] Detected item:', listing.itemHrid);
                            return listing.itemHrid;
                        }
                    }
                }
            }
        }

        console.log('[EstimatedListingAge] Could not detect item - no matching listings found');
        return null;
    }

    /**
     * Parse price from text (handles K/M suffixes)
     * @param {string} text - Price text
     * @returns {number} Price value
     */
    parsePrice(text) {
        let multiplier = 1;
        if (text.toUpperCase().includes('K')) {
            multiplier = 1000;
            text = text.replace(/K/gi, '');
        } else if (text.toUpperCase().includes('M')) {
            multiplier = 1000000;
            text = text.replace(/M/gi, '');
        }
        const numStr = text.replace(/[^0-9.]/g, '');
        return numStr ? Number(numStr) * multiplier : 0;
    }

    /**
     * Parse quantity from text
     * @param {string} text - Quantity text
     * @returns {number} Quantity value
     */
    parseQuantity(text) {
        // Remove emoji and parse number
        const numStr = text.replace(/[^0-9]/g, '');
        return numStr ? Number(numStr) : 0;
    }

    /**
     * Extract listing ID from order book row
     * @param {HTMLElement} row - Table row
     * @returns {number|null} Listing ID or null
     */
    extractListingId(row) {
        // Listing ID is typically stored in a data attribute or needs to be parsed
        // Check for data attributes first
        if (row.dataset.listingId) {
            return Number(row.dataset.listingId);
        }

        // Try to find it in the row's onclick or other attributes
        const onclick = row.getAttribute('onclick');
        if (onclick) {
            const match = onclick.match(/listing[Ii]d[:\s]*(\d+)/);
            if (match) {
                return Number(match[1]);
            }
        }

        // If we can't find it, return null
        return null;
    }

    /**
     * Estimate timestamp for a listing ID
     * @param {number} listingId - Listing ID to estimate
     * @returns {number} Estimated timestamp in milliseconds
     */
    estimateTimestamp(listingId) {
        if (this.knownListings.length === 0) {
            // No data, assume recent (1 hour ago)
            return Date.now() - (60 * 60 * 1000);
        }

        if (this.knownListings.length === 1) {
            // Only one data point, use it
            return this.knownListings[0].timestamp;
        }

        const minId = this.knownListings[0].id;
        const maxId = this.knownListings[this.knownListings.length - 1].id;

        // Check if ID is within known range
        if (listingId >= minId && listingId <= maxId) {
            return this.linearInterpolation(listingId);
        } else {
            return this.linearRegression(listingId);
        }
    }

    /**
     * Linear interpolation for IDs within known range
     * @param {number} listingId - Listing ID
     * @returns {number} Estimated timestamp
     */
    linearInterpolation(listingId) {
        // Check for exact match
        const exact = this.knownListings.find(entry => entry.id === listingId);
        if (exact) {
            return exact.timestamp;
        }

        // Find surrounding points
        let leftIndex = 0;
        let rightIndex = this.knownListings.length - 1;

        for (let i = 0; i < this.knownListings.length - 1; i++) {
            if (listingId >= this.knownListings[i].id && listingId <= this.knownListings[i + 1].id) {
                leftIndex = i;
                rightIndex = i + 1;
                break;
            }
        }

        const left = this.knownListings[leftIndex];
        const right = this.knownListings[rightIndex];

        // Linear interpolation formula
        const idRange = right.id - left.id;
        const idOffset = listingId - left.id;
        const ratio = idOffset / idRange;

        return left.timestamp + ratio * (right.timestamp - left.timestamp);
    }

    /**
     * Linear regression for IDs outside known range
     * @param {number} listingId - Listing ID
     * @returns {number} Estimated timestamp
     */
    linearRegression(listingId) {
        // Calculate linear regression coefficients
        let sumX = 0, sumY = 0;
        for (const entry of this.knownListings) {
            sumX += entry.id;
            sumY += entry.timestamp;
        }

        const n = this.knownListings.length;
        const meanX = sumX / n;
        const meanY = sumY / n;

        let numerator = 0;
        let denominator = 0;
        for (const entry of this.knownListings) {
            numerator += (entry.id - meanX) * (entry.timestamp - meanY);
            denominator += (entry.id - meanX) * (entry.id - meanX);
        }

        const slope = numerator / denominator;
        const intercept = meanY - slope * meanX;

        // Estimate timestamp using regression line
        return slope * listingId + intercept;
    }

    /**
     * Clear all injected displays
     */
    clearDisplays() {
        document.querySelectorAll('.mwi-estimated-age-set').forEach(container => {
            container.classList.remove('mwi-estimated-age-set');
        });
        document.querySelectorAll('.mwi-estimated-age-header').forEach(el => el.remove());
        document.querySelectorAll('.mwi-estimated-age-cell').forEach(el => el.remove());
    }

    /**
     * Disable the estimated listing age feature
     */
    disable() {
        if (this.unregisterWebSocket) {
            this.unregisterWebSocket();
            this.unregisterWebSocket = null;
        }

        if (this.unregisterObserver) {
            this.unregisterObserver();
            this.unregisterObserver = null;
        }

        this.clearDisplays();
    }
}

// Create and export singleton instance
const estimatedListingAge = new EstimatedListingAge();

export default estimatedListingAge;
