// Ad Astra - Alpha Tester Checklist System
// In-game testing checklist for alpha testers

import { Utils } from './utils.js';

class AlphaTesterSystem {
    constructor() {
        this.STORAGE_KEY = 'alpha_test_results';
        this.testCategories = this.initializeTests();
        this.results = new Map();
    }

    // Initialize all test cases
    initializeTests() {
        return {
            'Core Systems': [
                {
                    id: 'auth_login',
                    name: 'Login System',
                    test: 'Create account and login',
                    expected: 'Successfully creates account and logs in without errors',
                    importance: 'critical'
                },
                {
                    id: 'galaxy_load',
                    name: 'Galaxy Generation',
                    test: 'Check that galaxy loads/generates with 100 sectors',
                    expected: 'Galaxy map shows 100 connected sectors with warp lanes',
                    importance: 'critical'
                },
                {
                    id: 'ship_display',
                    name: 'Ship Stats Display',
                    test: 'View ship stats screen',
                    expected: 'Shows hull, cargo, fuel, class correctly',
                    importance: 'high'
                }
            ],
            'Navigation': [
                {
                    id: 'warp_travel',
                    name: 'Warp Travel',
                    test: 'Move between sectors using warp lanes',
                    expected: 'Consumes 1 turn and 1 fuel per jump. Updates position correctly.',
                    importance: 'critical'
                },
                {
                    id: 'warp_restrictions',
                    name: 'Warp Lane Restrictions',
                    test: 'Try to warp to non-connected sector',
                    expected: 'Should block warps to sectors without direct warp lane',
                    importance: 'high'
                },
                {
                    id: 'fuel_consumption',
                    name: 'Fuel System',
                    test: 'Warp until out of fuel',
                    expected: 'Prevents warping when fuel = 0. Shows warning.',
                    importance: 'high'
                },
                {
                    id: 'turn_consumption',
                    name: 'Turn System',
                    test: 'Use all turns',
                    expected: 'Prevents actions when turns = 0. Resets at midnight UTC.',
                    importance: 'high'
                }
            ],
            'Trading': [
                {
                    id: 'buy_commodity',
                    name: 'Buy Commodities',
                    test: 'Dock at planet and buy commodities',
                    expected: 'Deducts credits, adds cargo, shows correct prices',
                    importance: 'critical'
                },
                {
                    id: 'sell_commodity',
                    name: 'Sell Commodities',
                    test: 'Sell commodities at different planet',
                    expected: 'Adds credits, removes cargo, shows profit/loss',
                    importance: 'critical'
                },
                {
                    id: 'cargo_limits',
                    name: 'Cargo Capacity',
                    test: 'Try to buy more than cargo capacity',
                    expected: 'Prevents buying if cargo full. Shows capacity warning.',
                    importance: 'high'
                },
                {
                    id: 'daily_pricing',
                    name: 'Daily Price Changes',
                    test: 'Check prices, wait until next day, check again',
                    expected: 'Prices change daily at UTC midnight',
                    importance: 'medium'
                },
                {
                    id: 'port_specialties',
                    name: 'Port Specialization',
                    test: 'Visit different port types, compare prices',
                    expected: 'Mining ports favor ore, Agricultural favor organics, etc.',
                    importance: 'medium'
                }
            ],
            'Combat': [
                {
                    id: 'pirate_encounter',
                    name: 'Pirate Combat',
                    test: 'Encounter and fight pirates',
                    expected: 'Turn-based combat, damage calculation works, can attack/flee',
                    importance: 'high'
                },
                {
                    id: 'alien_encounter',
                    name: 'Alien Combat',
                    test: 'Encounter and fight aliens',
                    expected: 'Aliens are tougher than pirates, rewards are higher',
                    importance: 'medium'
                },
                {
                    id: 'combat_death',
                    name: 'Ship Destruction',
                    test: 'Lose combat (let ship be destroyed)',
                    expected: 'Game over screen, lose all cargo/credits, respawn option',
                    importance: 'high'
                },
                {
                    id: 'combat_flee',
                    name: 'Flee Combat',
                    test: 'Flee from combat encounter',
                    expected: 'Escape chance based on ship. May take damage if fails.',
                    importance: 'medium'
                }
            ],
            'Stations & Services': [
                {
                    id: 'station_refuel',
                    name: 'Refuel at Station',
                    test: 'Dock at station and refuel',
                    expected: 'Costs credits, refills fuel to max, different costs per port type',
                    importance: 'high'
                },
                {
                    id: 'station_repair',
                    name: 'Repair at Station',
                    test: 'Take damage, dock at station, repair',
                    expected: 'Costs credits per hull point, different rates per port type',
                    importance: 'high'
                },
                {
                    id: 'port_classes',
                    name: 'Port Types',
                    test: 'Visit all 6 port types (Mining, Ag, Industrial, Commercial, Black Market, Military)',
                    expected: 'Each has unique icon, services, and pricing',
                    importance: 'medium'
                }
            ],
            'Strategic Systems': [
                {
                    id: 'nav_route_planner',
                    name: 'Navigation Route Planner',
                    test: 'Use Computer > Navigation > calculate route to distant sector',
                    expected: 'Shows optimal path, jump count, fuel needed, turn cost',
                    importance: 'high'
                },
                {
                    id: 'nav_find_nearest',
                    name: 'Find Nearest Location',
                    test: 'Use Computer > Navigation > find nearest planet/station',
                    expected: 'Shows closest location with distance and jumps',
                    importance: 'medium'
                },
                {
                    id: 'nav_trade_route',
                    name: 'Trade Route Finder',
                    test: 'Use Computer > Navigation > find best trade route',
                    expected: 'Shows profitable trade route with profit calculations',
                    importance: 'high'
                },
                {
                    id: 'intel_sector',
                    name: 'Sector Intel',
                    test: 'Use Computer > Intel > current sector analysis',
                    expected: 'Shows connections, contents, nearby locations',
                    importance: 'medium'
                },
                {
                    id: 'intel_galaxy',
                    name: 'Galaxy Analysis',
                    test: 'Use Computer > Intel > analyze galaxy',
                    expected: 'Shows galaxy stats, port distribution, connectivity',
                    importance: 'low'
                },
                {
                    id: 'bookmarks',
                    name: 'Sector Bookmarks',
                    test: 'Use Computer > Bookmarks > add bookmark for a sector',
                    expected: 'Saves bookmark with name and notes, can view/remove',
                    importance: 'low'
                },
                {
                    id: 'fighter_deploy',
                    name: 'Deploy Fighters',
                    test: 'Use Computer > Fighters > deploy fighters in sector',
                    expected: 'Costs 50cr each, max 50 per sector, shows in summary',
                    importance: 'medium'
                },
                {
                    id: 'mine_deploy',
                    name: 'Deploy Mines',
                    test: 'Use Computer > Fighters > deploy mines in sector',
                    expected: 'Costs 100cr each, max 20 per sector, shows in summary',
                    importance: 'medium'
                },
                {
                    id: 'genesis_torpedo',
                    name: 'Genesis Torpedo',
                    test: 'Use Computer > Colonies > launch genesis in empty sector',
                    expected: 'Costs 10,000cr, creates new planet, max 5 colonies',
                    importance: 'high'
                },
                {
                    id: 'colony_income',
                    name: 'Colony Passive Income',
                    test: 'Create colony, wait, collect income',
                    expected: 'Generates 100cr/day base, collects based on time elapsed',
                    importance: 'high'
                },
                {
                    id: 'colony_upgrade',
                    name: 'Colony Upgrades',
                    test: 'Upgrade colony (income or population)',
                    expected: 'Costs increase exponentially, improves colony stats',
                    importance: 'medium'
                }
            ],
            'Multiplayer': [
                {
                    id: 'player_presence',
                    name: 'Player Presence Display',
                    test: 'Check sector with multiple players (or create test accounts)',
                    expected: 'Shows "X players in sector" or list of player names',
                    importance: 'critical'
                },
                {
                    id: 'port_player_list',
                    name: 'Players at Port',
                    test: 'Dock at station, check for other players',
                    expected: 'Shows list of players docked at same location',
                    importance: 'high'
                },
                {
                    id: 'pvp_initiate',
                    name: 'Initiate PvP Combat',
                    test: 'Attack another player in undefended sector',
                    expected: 'Starts PvP combat, turn-based like NPC combat',
                    importance: 'critical'
                },
                {
                    id: 'pvp_military_protection',
                    name: 'Military Port Protection',
                    test: 'Try to attack player docked at Military port',
                    expected: 'Blocks attack, shows "cannot attack at military outpost"',
                    importance: 'high'
                },
                {
                    id: 'fighter_auto_defense',
                    name: 'Fighter Auto-Defense',
                    test: 'Enter sector with enemy fighters deployed',
                    expected: 'Fighters automatically attack, deals damage, shows combat log',
                    importance: 'high'
                },
                {
                    id: 'mine_trigger',
                    name: 'Mine Triggers',
                    test: 'Warp into sector with mines',
                    expected: '30% chance per mine to trigger, 25 damage each, mines destroyed',
                    importance: 'high'
                }
            ],
            'Message Board': [
                {
                    id: 'msg_post',
                    name: 'Post Message',
                    test: 'Post message on planet/station message board',
                    expected: 'Message appears in list with timestamp and type',
                    importance: 'medium'
                },
                {
                    id: 'msg_reply',
                    name: 'Reply to Message',
                    test: 'Reply to existing message',
                    expected: 'Reply appears in thread under original message',
                    importance: 'medium'
                },
                {
                    id: 'msg_filter',
                    name: 'Filter Messages',
                    test: 'Use filter dropdown to show only one message type',
                    expected: 'Shows only messages of selected type',
                    importance: 'low'
                },
                {
                    id: 'msg_search',
                    name: 'Search Messages',
                    test: 'Search for keyword in messages',
                    expected: 'Filters messages containing search term',
                    importance: 'low'
                }
            ],
            'UI/UX': [
                {
                    id: 'mobile_responsive',
                    name: 'Mobile Responsiveness',
                    test: 'Test on mobile device or resize browser to phone size',
                    expected: 'All UI elements readable and clickable on small screen',
                    importance: 'high'
                },
                {
                    id: 'galaxy_map_zoom',
                    name: 'Galaxy Map Zoom',
                    test: 'Zoom in and out on galaxy map',
                    expected: 'Smooth zooming, sectors remain clickable',
                    importance: 'medium'
                },
                {
                    id: 'galaxy_map_pan',
                    name: 'Galaxy Map Pan',
                    test: 'Click and drag galaxy map',
                    expected: 'Smooth panning, can view entire galaxy',
                    importance: 'medium'
                },
                {
                    id: 'ship_log',
                    name: 'Ship\'s Log Messages',
                    test: 'Perform various actions, check message log',
                    expected: 'All important events logged with color coding',
                    importance: 'low'
                }
            ],
            'Performance': [
                {
                    id: 'load_time',
                    name: 'Initial Load Time',
                    test: 'Time from opening game to login screen',
                    expected: 'Should load in < 3 seconds on normal connection',
                    importance: 'medium'
                },
                {
                    id: 'galaxy_render',
                    name: 'Galaxy Map Performance',
                    test: 'Open galaxy map, pan and zoom around',
                    expected: 'Should be smooth, no lag or stuttering',
                    importance: 'medium'
                },
                {
                    id: 'no_crashes',
                    name: 'Stability',
                    test: 'Play for 30+ minutes continuously',
                    expected: 'No crashes, errors, or frozen UI',
                    importance: 'critical'
                }
            ]
        };
    }

    // Record test result
    recordTest(testId, status, notes = '') {
        this.results.set(testId, {
            status, // 'pass', 'fail', 'skip'
            notes,
            timestamp: Date.now(),
            tester: localStorage.getItem('currentUser') || 'anonymous'
        });
        this.save();
    }

    // Get test result
    getTest(testId) {
        return this.results.get(testId);
    }

    // Get all results
    getAllResults() {
        return Object.fromEntries(this.results);
    }

    // Get completion percentage
    getCompletion() {
        let total = 0;
        let completed = 0;

        for (const category in this.testCategories) {
            total += this.testCategories[category].length;
            for (const test of this.testCategories[category]) {
                if (this.results.has(test.id)) {
                    completed++;
                }
            }
        }

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    }

    // Export results as JSON
    exportResults() {
        const results = {
            timestamp: Date.now(),
            tester: localStorage.getItem('currentUser') || 'anonymous',
            gameVersion: '0.8.0',
            completion: this.getCompletion(),
            tests: this.getAllResults()
        };

        const json = JSON.stringify(results, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ad-astra-test-results-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return results;
    }

    // Clear all results
    clearResults() {
        this.results.clear();
        this.save();
    }

    // Save to localStorage
    save() {
        Utils.storage.set(this.STORAGE_KEY, Object.fromEntries(this.results));
    }

    // Load from localStorage
    load() {
        const data = Utils.storage.get(this.STORAGE_KEY);
        if (data) {
            this.results = new Map(Object.entries(data));
            return true;
        }
        return false;
    }
}

export default AlphaTesterSystem;
