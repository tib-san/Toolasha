/**
 * Tab Detection Diagnostic Script (Updated)
 *
 * Instructions:
 * 1. Open the Enhancing action panel in the game
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run it
 * 5. Click between "Enhance" and "Current Action" tabs
 * 6. Watch the console output to see what changes
 */

(function() {
    console.log('🔍 Tab Detection Diagnostic Tool Started (v2)');
    console.log('==============================================\n');

    // Find the enhancing panel
    const panel = document.querySelector('div.SkillActionDetail_enhancingComponent__17bOx');
    if (!panel) {
        console.error('❌ Enhancing panel not found! Please open an enhancing action first.');
        return;
    }

    console.log('✅ Found enhancing panel:', panel);

    // Walk up the DOM tree to find where the tabs are
    console.log('\n🌳 Walking up DOM tree to find tab buttons...\n');

    let current = panel;
    let depth = 0;
    const maxDepth = 10;

    while (current && depth < maxDepth) {
        // Look for buttons in this ancestor
        const buttonsInAncestor = current.querySelectorAll('button');
        const tabButtons = Array.from(buttonsInAncestor).filter(btn => {
            const text = btn.textContent.trim();
            return text === 'Enhance' || text === 'Current Action';
        });

        if (tabButtons.length > 0) {
            console.log(`✅ Found tab buttons at depth ${depth}!`);
            console.log('   Parent element:', current.tagName, current.className);
            console.log('   Tab buttons found:', tabButtons.length);

            // Store for later use
            window.foundTabParent = current;
            window.foundTabButtons = tabButtons;
            break;
        }

        current = current.parentElement;
        depth++;
    }

    if (!window.foundTabParent) {
        console.error('❌ Could not find tab buttons within 10 parent levels!');
        console.log('Searching entire document instead...');

        // Search entire document as fallback
        const allButtons = Array.from(document.querySelectorAll('button'));
        const tabButtons = allButtons.filter(btn => {
            const text = btn.textContent.trim();
            return text === 'Enhance' || text === 'Current Action';
        });

        if (tabButtons.length > 0) {
            console.log(`✅ Found ${tabButtons.length} tab buttons in document!`);
            window.foundTabButtons = tabButtons;

            // Find their common parent
            if (tabButtons.length >= 2) {
                let parent = tabButtons[0].parentElement;
                while (parent && !parent.contains(tabButtons[1])) {
                    parent = parent.parentElement;
                }
                window.foundTabParent = parent;
                console.log('Common parent:', parent?.tagName, parent?.className);
            }
        } else {
            console.error('❌ No tab buttons found anywhere in document!');
            return;
        }
    }

    const tabButtons = window.foundTabButtons;
    const tabParent = window.foundTabParent;

    // Function to inspect a button's state
    function inspectButton(button, label) {
        const text = button.textContent.trim();
        const computedStyle = window.getComputedStyle(button);

        console.log(`\n🔎 Inspecting: ${label} ("${text}")`);
        console.log('─────────────────────────────────────');

        // Check various properties that might indicate active state
        console.log('📌 Element Info:');
        console.log('  element:', button);
        console.log('  tagName:', button.tagName);

        console.log('\n📌 Attributes:');
        Array.from(button.attributes).forEach(attr => {
            console.log(`  ${attr.name}:`, attr.value);
        });

        console.log('\n🎨 CSS Classes:');
        console.log('  classList:', Array.from(button.classList).join(', '));

        console.log('\n🎨 Computed Styles:');
        console.log('  backgroundColor:', computedStyle.backgroundColor);
        console.log('  color:', computedStyle.color);
        console.log('  opacity:', computedStyle.opacity);
        console.log('  fontWeight:', computedStyle.fontWeight);
        console.log('  borderBottom:', computedStyle.borderBottom);
        console.log('  textDecoration:', computedStyle.textDecoration);

        console.log('\n🌳 Parent Info:');
        console.log('  parent.tagName:', button.parentElement?.tagName);
        console.log('  parent.className:', button.parentElement?.className);

        if (button.parentElement) {
            console.log('  parent attributes:');
            Array.from(button.parentElement.attributes || []).forEach(attr => {
                console.log(`    ${attr.name}:`, attr.value);
            });
        }
    }

    // Initial inspection
    console.log('\n\n═══════════════════════════════════════');
    console.log('📸 INITIAL STATE');
    console.log('═══════════════════════════════════════');

    tabButtons.forEach((btn, i) => {
        inspectButton(btn, `Tab Button ${i}`);
    });

    // Set up click listeners
    console.log('\n\n═══════════════════════════════════════');
    console.log('👂 Setting up click listeners...');
    console.log('═══════════════════════════════════════');
    console.log('Click between tabs and watch for changes!\n');

    tabButtons.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            setTimeout(() => {
                console.log('\n\n🖱️ TAB CLICKED!');
                console.log('═══════════════════════════════════════');
                tabButtons.forEach((b, j) => {
                    inspectButton(b, `Tab Button ${j} ${i === j ? '👈 (clicked)' : ''}`);
                });
            }, 150); // Slightly longer delay to let changes propagate
        });
    });

    // Convenience function to check current state anytime
    window.checkTabState = function() {
        console.log('\n\n📸 CURRENT TAB STATE (manual check)');
        console.log('═══════════════════════════════════════');
        tabButtons.forEach((btn, i) => {
            inspectButton(btn, `Tab Button ${i}`);
        });
    };

    console.log('\n✅ Diagnostic tool ready!');
    console.log('💡 Tips:');
    console.log('  - Click between tabs to see what changes');
    console.log('  - Run checkTabState() anytime to inspect current state');
    console.log('  - Look for consistent indicators of the active tab');
    console.log('  - Pay attention to class names, aria attributes, or styles that differ\n');
})();
