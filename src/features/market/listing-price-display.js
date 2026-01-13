/**
 * Market Listing Price Display Module
 *
 * Shows pricing information on individual market listings
 * - Top Order Price: Current best market price with competitive color coding
 * - Total Price: Total remaining value of the listing
 * Ported from Ranged Way Idle's showListingInfo feature
 */

import dataManager from '../../core/data-manager.js';
import domObserver from '../../core/dom-observer.js';
import config from '../../core/config.js';
import webSocketHook from '../../core/websocket.js';
import marketAPI from '../../api/marketplace.js';
import { coinFormatter } from '../../utils/formatters.js';

class ListingPriceDisplay {
    constructor() {
        this.allListings = {}; // Maintained listing state
        this.unregisterWebSocket = null;
        this.unregisterObserver = null;
    }

    /**
     * Initialize the listing price display
     */
    initialize() {
        if (!config.getSetting('market_showListingPrices')) {
            return;
        }

        // Load initial listings from dataManager
        this.loadInitialListings();

        this.setupWebSocketListeners();
        this.setupObserver();
    }

    /**
     * Load initial listings from dataManager (already received via init_character_data)
     */
    loadInitialListings() {
        const listings = dataManager.getMarketListings();

        for (const listing of listings) {
            this.handleListing(listing);
        }
    }

    /**
     * Setup WebSocket listeners for listing updates
     */
    setupWebSocketListeners() {
        // Handle initial character data
        const initHandler = (data) => {
            if (data.myMarketListings) {
                for (const listing of data.myMarketListings) {
                    this.handleListing(listing);
                }
            }
        };

        // Handle listing updates
        const updateHandler = (data) => {
            if (data.endMarketListings) {
                for (const listing of data.endMarketListings) {
                    this.handleListing(listing);
                }
                // Clear existing displays to force refresh
                this.clearDisplays();
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
     * Setup DOM observer to watch for My Listings table
     */
    setupObserver() {
        this.unregisterObserver = domObserver.onClass(
            'ListingPriceDisplay',
            'MarketplacePanel_myListingsTable',
            (tableNode) => {
                this.updateTable(tableNode);
            }
        );

        // Check for existing table
        const existingTable = document.querySelector('[class*="MarketplacePanel_myListingsTable"]');
        if (existingTable) {
            this.updateTable(existingTable);
        }
    }

    /**
     * Handle listing data from WebSocket
     * @param {Object} listing - Listing data
     */
    handleListing(listing) {
        // Filter out cancelled and fully claimed listings
        if (listing.status === "/market_listing_status/cancelled" ||
            (listing.status === "/market_listing_status/filled" &&
             listing.unclaimedItemCount === 0 &&
             listing.unclaimedCoinCount === 0)) {
            delete this.allListings[listing.id];
            return;
        }

        // Store/update listing data
        this.allListings[listing.id] = {
            id: listing.id,
            isSell: listing.isSell,
            itemHrid: listing.itemHrid,
            enhancementLevel: listing.enhancementLevel,
            orderQuantity: listing.orderQuantity,
            filledQuantity: listing.filledQuantity,
            price: listing.price,
            createdTimestamp: listing.createdTimestamp
        };
    }

    /**
     * Update the My Listings table with pricing columns
     * @param {HTMLElement} tableNode - The listings table element
     */
    updateTable(tableNode) {
        // Skip if already processed
        if (tableNode.classList.contains('mwi-listing-prices-set')) {
            return;
        }

        // Wait until row count matches listing count
        const tbody = tableNode.querySelector('tbody');
        if (!tbody) {
            return;
        }

        const rowCount = tbody.querySelectorAll('tr').length;
        const listingCount = Object.keys(this.allListings).length;

        if (rowCount !== listingCount) {
            return; // Table not fully populated yet
        }

        // Mark as processed
        tableNode.classList.add('mwi-listing-prices-set');

        // OPTIMIZATION: Pre-fetch all market prices in one batch
        const itemsToPrice = Object.values(this.allListings).map(listing => ({
            itemHrid: listing.itemHrid,
            enhancementLevel: listing.enhancementLevel
        }));
        const priceCache = marketAPI.getPricesBatch(itemsToPrice);

        // Add table headers
        this.addTableHeaders(tableNode);

        // Add data to rows
        this.addDataToRows(tbody);

        // Add price displays to each row
        this.addPriceDisplays(tbody, priceCache);
    }

    /**
     * Add column headers to table head
     * @param {HTMLElement} tableNode - The listings table
     */
    addTableHeaders(tableNode) {
        const thead = tableNode.querySelector('thead tr');
        if (!thead) return;

        // Skip if headers already added
        if (thead.querySelector('.mwi-listing-price-header')) {
            return;
        }

        // Create "Top Order Price" header
        const topOrderHeader = document.createElement('th');
        topOrderHeader.classList.add('mwi-listing-price-header');
        topOrderHeader.textContent = 'Top Order Price';

        // Create "Total Price" header
        const totalPriceHeader = document.createElement('th');
        totalPriceHeader.classList.add('mwi-listing-price-header');
        totalPriceHeader.textContent = 'Total Price';

        // Insert before 4th and 5th children (after item/type/quantity/price columns)
        thead.insertBefore(topOrderHeader, thead.children[4]);
        thead.insertBefore(totalPriceHeader, thead.children[5]);
    }

    /**
     * Add listing data to row datasets for matching
     * @param {HTMLElement} tbody - Table body element
     */
    addDataToRows(tbody) {
        const listings = Object.values(this.allListings);
        const used = new Set();

        for (const row of tbody.querySelectorAll('tr')) {
            const rowInfo = this.extractRowInfo(row);

            // Find matching listing
            const matchedListing = listings.find(listing => {
                if (used.has(listing.id)) return false;

                return listing.itemHrid === rowInfo.itemHrid &&
                       listing.enhancementLevel === rowInfo.enhancementLevel &&
                       listing.isSell === rowInfo.isSell &&
                       (!rowInfo.price || Math.abs(listing.price - rowInfo.price) < 0.01);
            });

            if (matchedListing) {
                used.add(matchedListing.id);
                // Store listing data in row dataset
                row.dataset.listingId = matchedListing.id;
                row.dataset.itemHrid = matchedListing.itemHrid;
                row.dataset.enhancementLevel = matchedListing.enhancementLevel;
                row.dataset.isSell = matchedListing.isSell;
                row.dataset.price = matchedListing.price;
                row.dataset.orderQuantity = matchedListing.orderQuantity;
                row.dataset.filledQuantity = matchedListing.filledQuantity;
            }
        }
    }

    /**
     * Extract listing info from table row for matching
     * @param {HTMLElement} row - Table row element
     * @returns {Object} Extracted row info
     */
    extractRowInfo(row) {
        // Extract itemHrid from SVG use element
        let itemHrid = null;
        const useElements = row.querySelectorAll('use');
        for (const use of useElements) {
            const href = use.href && use.href.baseVal ? use.href.baseVal : '';
            if (href.includes('#')) {
                const idPart = href.split('#')[1];
                if (idPart && !idPart.toLowerCase().includes('coin')) {
                    itemHrid = `/items/${idPart}`;
                    break;
                }
            }
        }

        // Extract enhancement level
        let enhancementLevel = 0;
        const enhNode = row.querySelector('[class*="enhancementLevel"]');
        if (enhNode && enhNode.textContent) {
            const match = enhNode.textContent.match(/\+\s*(\d+)/);
            if (match) {
                enhancementLevel = Number(match[1]);
            }
        }

        // Detect isSell from type cell (2nd cell)
        let isSell = null;
        const typeCell = row.children[1];
        if (typeCell) {
            const text = (typeCell.textContent || '').toLowerCase();
            if (text.includes('sell')) {
                isSell = true;
            } else if (text.includes('buy')) {
                isSell = false;
            }
        }

        // Extract price (4th cell before our inserts)
        let price = NaN;
        const priceNode = row.querySelector('[class*="price"]') || row.children[3];
        if (priceNode) {
            let text = (priceNode.firstChild && priceNode.firstChild.textContent)
                ? priceNode.firstChild.textContent
                : priceNode.textContent;
            text = String(text).trim();

            // Handle K/M suffixes (e.g., "340K" = 340000, "1.5M" = 1500000)
            let multiplier = 1;
            if (text.toUpperCase().includes('K')) {
                multiplier = 1000;
                text = text.replace(/K/gi, '');
            } else if (text.toUpperCase().includes('M')) {
                multiplier = 1000000;
                text = text.replace(/M/gi, '');
            }

            const numStr = text.replace(/[^0-9.]/g, '');
            price = numStr ? Number(numStr) * multiplier : NaN;
        }

        return { itemHrid, enhancementLevel, isSell, price };
    }

    /**
     * Add price display cells to each row
     * @param {HTMLElement} tbody - Table body element
     * @param {Map} priceCache - Pre-fetched price cache
     */
    addPriceDisplays(tbody, priceCache) {
        for (const row of tbody.querySelectorAll('tr')) {
            // Skip if displays already added
            if (row.querySelector('.mwi-listing-price-cell')) {
                continue;
            }

            const dataset = row.dataset;

            if (!dataset.listingId) {
                continue;
            }

            const itemHrid = dataset.itemHrid;
            const enhancementLevel = Number(dataset.enhancementLevel);
            const isSell = dataset.isSell === 'true';
            const price = Number(dataset.price);
            const orderQuantity = Number(dataset.orderQuantity);
            const filledQuantity = Number(dataset.filledQuantity);

            // Create Top Order Price cell
            const topOrderCell = this.createTopOrderPriceCell(itemHrid, enhancementLevel, isSell, price, priceCache);
            row.insertBefore(topOrderCell, row.children[4]);

            // Create Total Price cell
            const totalPriceCell = this.createTotalPriceCell(itemHrid, isSell, price, orderQuantity, filledQuantity);
            row.insertBefore(totalPriceCell, row.children[5]);
        }
    }

    /**
     * Create Top Order Price cell
     * @param {string} itemHrid - Item HRID
     * @param {number} enhancementLevel - Enhancement level
     * @param {boolean} isSell - Is sell order
     * @param {number} price - Listing price
     * @param {Map} priceCache - Pre-fetched price cache
     * @returns {HTMLElement} Table cell element
     */
    createTopOrderPriceCell(itemHrid, enhancementLevel, isSell, price, priceCache) {
        const cell = document.createElement('td');
        cell.classList.add('mwi-listing-price-cell');

        const span = document.createElement('span');
        span.classList.add('mwi-listing-price-value');

        // Get current market price from cache
        const key = `${itemHrid}:${enhancementLevel}`;
        const marketPrice = priceCache.get(key);
        const topOrderPrice = marketPrice ? (isSell ? marketPrice.ask : marketPrice.bid) : null;

        if (topOrderPrice === null || topOrderPrice === -1) {
            span.textContent = coinFormatter(null);
            span.style.color = '#004FFF'; // Blue for no data
        } else {
            span.textContent = coinFormatter(topOrderPrice);

            // Color coding based on competitiveness
            if (isSell) {
                // Sell order: green if our price is lower (better), red if higher (undercut)
                span.style.color = topOrderPrice < price ? '#FF0000' : '#00FF00';
            } else {
                // Buy order: green if our price is higher (better), red if lower (undercut)
                span.style.color = topOrderPrice > price ? '#FF0000' : '#00FF00';
            }
        }

        cell.appendChild(span);
        return cell;
    }

    /**
     * Create Total Price cell
     * @param {string} itemHrid - Item HRID
     * @param {boolean} isSell - Is sell order
     * @param {number} price - Unit price
     * @param {number} orderQuantity - Total quantity ordered
     * @param {number} filledQuantity - Quantity already filled
     * @returns {HTMLElement} Table cell element
     */
    createTotalPriceCell(itemHrid, isSell, price, orderQuantity, filledQuantity) {
        const cell = document.createElement('td');
        cell.classList.add('mwi-listing-price-cell');

        const span = document.createElement('span');
        span.classList.add('mwi-listing-price-value');

        // Calculate tax (0.82 for cowbells, 0.98 for others, 1.0 for buy orders)
        const tax = isSell ? (itemHrid === '/items/bag_of_10_cowbells' ? 0.82 : 0.98) : 1.0;

        // Calculate total price for remaining quantity
        const totalPrice = (orderQuantity - filledQuantity) * Math.floor(price * tax);

        // Format and color code
        span.textContent = coinFormatter(totalPrice);

        // Color based on amount
        span.style.color = this.getAmountColor(totalPrice);

        cell.appendChild(span);
        return cell;
    }

    /**
     * Get color for amount based on magnitude
     * @param {number} amount - Amount value
     * @returns {string} Color code
     */
    getAmountColor(amount) {
        if (amount >= 1000000) return '#FFD700'; // Gold for 1M+
        if (amount >= 100000) return '#00FF00';  // Green for 100K+
        if (amount >= 10000) return '#FFFFFF';   // White for 10K+
        return '#AAAAAA'; // Gray for small amounts
    }

    /**
     * Clear all injected displays
     */
    clearDisplays() {
        document.querySelectorAll('.mwi-listing-prices-set').forEach(table => {
            table.classList.remove('mwi-listing-prices-set');
        });
        document.querySelectorAll('.mwi-listing-price-header').forEach(el => el.remove());
        document.querySelectorAll('.mwi-listing-price-cell').forEach(el => el.remove());
    }

    /**
     * Disable the listing price display
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
        this.allListings = {};
    }
}

// Create and export singleton instance
const listingPriceDisplay = new ListingPriceDisplay();

export default listingPriceDisplay;
