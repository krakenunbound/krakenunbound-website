// Ad Astra - Galaxy Generation
// galaxy.js - Galaxy creation, sector management, and exploration

import { Utils, CONSTANTS } from './utils.js';

export class Galaxy {
    constructor() {
        this.data = null;
    }

    // Generate a new galaxy
    generate(size = CONSTANTS.GALAXY.DEFAULT_SIZE, seed = null) {
        // Generate or use provided seed
        const galaxySeed = seed || Utils.generateId();
        console.log(`Generating galaxy with ${size} sectors, seed: ${galaxySeed}...`);

        // Create seeded random number generator
        const rng = new Utils.SeededRandom(galaxySeed);

        const sectors = {};

        // Create all sectors
        for (let i = 1; i <= size; i++) {
            sectors[i] = this.createSector(i, size, rng);
        }

        // --- INJECT SCI-FI LORE ---
        this.embedSciFiLore(sectors, size, rng);
        // --------------------------

        // Connect sectors with warps
        this.connectSectors(sectors, size, rng);

        this.data = {
            size: size,
            sectors: sectors,
            seed: galaxySeed,
            created: Date.now()
        };

        // Save to storage
        Utils.storage.set('galaxy', this.data);

        console.log('Galaxy generated successfully!');
        return this.data;
    }

    // Create a single sector
    createSector(id, galaxySize, rng) {
        const sector = {
            id: id,
            x: rng.float(0, 100),
            y: rng.float(0, 100),
            warps: [],
            contents: []
        };

        // Add a planet?
        if (rng.chance(CONSTANTS.GALAXY.PLANET_CHANCE)) {
            sector.contents.push(this.generatePlanet(rng));
        }

        // Add a station?
        if (rng.chance(CONSTANTS.GALAXY.STATION_CHANCE)) {
            sector.contents.push(this.generateStation(rng));
        }

        // Add debris/asteroids?
        if (rng.chance(0.2) && sector.contents.length === 0) {
            sector.contents.push({
                type: 'debris',
                name: 'Asteroid Field',
                description: 'Scattered asteroids that could be mined for resources'
            });
        }

        return sector;
    }

    // Generate a planet with economy
    generatePlanet(rng) {
        const planetTypes = [
            { name: 'Desert', specialty: 'Ore' },
            { name: 'Forest', specialty: 'Organics' },
            { name: 'Industrial', specialty: 'Equipment' },
            { name: 'Ocean', specialty: 'Organics' },
            { name: 'Rocky', specialty: 'Ore' },
            { name: 'Urban', specialty: 'Equipment' }
        ];

        const type = rng.choice(planetTypes);
        const planetNames = [
            'Alpha Prime', 'Beta Station', 'Gamma Outpost', 'Delta World',
            'Epsilon Colony', 'Zeta Haven', 'Theta Base', 'Nova Terra',
            'Proxima', 'Kepler Station', 'Titan Outpost', 'Europa Base'
        ];

        const planet = {
            type: 'planet',
            name: `${rng.choice(planetNames)} ${rng.int(1, 999)}`,
            planetType: type.name,
            specialty: type.specialty,
            economy: {},
            population: rng.int(1000, 1000000),
            techLevel: rng.int(1, 10),
            messageBoard: true // Planets also have message boards
        };

        // Generate economy prices
        // Generate economy prices based on TradeWars logic
        // STRICT PRODUCER/CONSUMER MODEL
        for (const commodity of CONSTANTS.COMMODITIES) {
            // Contraband is ONLY sold at Black Market stations
            if (commodity === 'Contraband') continue;

            const economyData = CONSTANTS.ECONOMY[commodity];
            let basePrice = economyData.basePrice;
            const isSpecialty = (commodity === type.specialty);

            if (isSpecialty) {
                // PRODUCER: Planet produces this. 
                // High Supply, Low Buy Price (Player Buys Cheap), Low Sell Price (Planet won't pay much for it)
                planet.economy[commodity] = {
                    buyPrice: Math.round(basePrice * 0.7), // Player buys at 70% (Cheap)
                    sellPrice: Math.round(basePrice * 0.5), // Player sells at 50% (Bad deal)
                    supply: rng.int(500, 2000) // Abundant supply
                };
            } else {
                // CONSUMER: Planet needs this.
                // Zero Supply (Can't buy), High Sell Price (Player Sells High)
                planet.economy[commodity] = {
                    buyPrice: Math.round(basePrice * 3.0), // Exorbitant (if stock existed)
                    sellPrice: Math.round(basePrice * 1.4), // Player sells at 140% (Great deal)
                    supply: 0 // None for sale
                };
            }
        }

        return planet;
    }

    // Generate a space station with classification
    generateStation(rng) {
        const stationTypes = [
            {
                class: 'Mining',
                icon: '⛏️',
                specialties: ['Ore'],
                services: ['repair', 'refuel', 'trade'],
                description: 'A rough-and-tumble mining outpost dealing primarily in raw materials',
                repairCost: 6, // Higher repair costs
                refuelCost: 2,
                tradingBonus: 1.2 // Better prices for ore
            },
            {
                class: 'Agricultural',
                icon: '🌾',
                specialties: ['Organics'],
                services: ['repair', 'refuel', 'trade'],
                description: 'An agricultural station with hydroponic farms and bio-domes',
                repairCost: 5,
                refuelCost: 2,
                tradingBonus: 1.2 // Better prices for organics
            },
            {
                class: 'Industrial',
                icon: '🏭',
                specialties: ['Equipment'],
                services: ['repair', 'refuel', 'trade', 'upgrade'],
                description: 'A high-tech industrial complex specializing in equipment and ship parts',
                repairCost: 4, // Lower repair costs
                refuelCost: 2,
                tradingBonus: 1.2 // Better prices for equipment
            },
            {
                class: 'Commercial',
                icon: '🏢',
                specialties: ['Ore', 'Organics', 'Equipment'],
                services: ['repair', 'refuel', 'trade', 'bank'],
                description: 'A bustling commercial hub with general trading facilities',
                repairCost: 5,
                refuelCost: 2,
                tradingBonus: 1.0 // Standard prices
            },
            {
                class: 'Black Market',
                icon: '💀',
                specialties: ['Contraband'],
                services: ['refuel', 'trade'],
                description: 'A secretive outpost dealing in illegal goods - no questions asked',
                repairCost: 8, // Very expensive repairs
                refuelCost: 3, // Higher fuel costs
                tradingBonus: 1.5, // Much better prices for contraband
                hidden: true // Doesn't show up easily
            },
            {
                class: 'Military',
                icon: '🛡️',
                specialties: ['Equipment'],
                services: ['repair', 'refuel', 'upgrade'],
                description: 'A fortified military outpost with advanced repair facilities',
                repairCost: 3, // Cheapest repairs
                refuelCost: 1, // Cheapest fuel
                tradingBonus: 0.8, // Worse trading prices
                defended: true // Has defensive capabilities
            }
        ];

        const stationType = rng.choice(stationTypes);
        const stationNames = [
            'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta',
            'Omega', 'Nova', 'Nexus', 'Haven', 'Outpost', 'Station'
        ];

        // Generate station object
        const station = {
            type: 'station',
            class: stationType.class,
            icon: stationType.icon,
            name: `${stationType.class} ${rng.choice(stationNames)} ${rng.int(1, 99)}`,
            description: stationType.description,
            specialties: stationType.specialties,
            services: stationType.services,
            repairCost: stationType.repairCost,
            refuelCost: stationType.refuelCost,
            tradingBonus: stationType.tradingBonus || 1.0,
            hidden: stationType.hidden || false,
            defended: stationType.defended || false,
            messageBoard: true,
            economy: {}
        };

        // Generate economy for stations with trade services
        if (stationType.services.includes('trade')) {
            const commodities = [...new Set([...stationType.specialties, 'Ore', 'Organics', 'Equipment'])];

            // Add contraband for black markets
            if (stationType.class === 'Black Market') {
                commodities.push('Contraband');
            }

            commodities.forEach(commodity => {
                const economyData = CONSTANTS.ECONOMY[commodity];
                if (!economyData) return;

                let price = economyData.basePrice;
                const isSpecialty = stationType.specialties.includes(commodity);

                if (isSpecialty) {
                    price *= 0.85;
                }
                price *= (2 - stationType.tradingBonus);
                price *= (0.9 + rng.float(0, 1) * 0.2);
                price = Math.round(price);

                let supply = Math.floor(rng.float(0, 1) * 80) + 20;
                if (isSpecialty) supply *= 2;

                station.economy[commodity] = {
                    buyPrice: price,
                    sellPrice: Math.round(price * (isSpecialty ? 0.9 : 0.8)),
                    supply: supply
                };
            });
        }

        station.planetType = stationType.class;
        station.techLevel = stationType.class === 'Military' ? 5 :
            stationType.class === 'Industrial' ? 4 :
                stationType.class === 'Commercial' ? 3 : 2;

        return station;
    }

    // Connect sectors with warp lanes
    connectSectors(sectors, size, rng) {
        const sectorIds = Object.keys(sectors).map(Number);

        // First, create a spanning tree to ensure all sectors are reachable
        const visited = new Set([1]);
        const unvisited = new Set(sectorIds.filter(id => id !== 1));

        while (unvisited.size > 0) {
            // Find closest unvisited sector to any visited sector
            let minDist = Infinity;
            let bestPair = null;

            for (const vid of visited) {
                const v = sectors[vid];
                for (const uid of unvisited) {
                    const u = sectors[uid];
                    const dist = Utils.distance(v.x, v.y, u.x, u.y);
                    if (dist < minDist) {
                        minDist = dist;
                        bestPair = [vid, uid];
                    }
                }
            }

            if (bestPair) {
                const [vid, uid] = bestPair;
                this.addWarp(sectors[vid], sectors[uid]);
                visited.add(uid);
                unvisited.delete(uid);
            }
        }

        // Add additional random connections for more interesting navigation
        const additionalConnections = Math.floor(size * 0.5);
        for (let i = 0; i < additionalConnections; i++) {
            const id1 = rng.choice(sectorIds);
            const id2 = rng.choice(sectorIds);

            if (id1 !== id2 && !sectors[id1].warps.includes(id2)) {
                const dist = Utils.distance(
                    sectors[id1].x, sectors[id1].y,
                    sectors[id2].x, sectors[id2].y
                );

                // Only connect if reasonably close
                if (dist < 30) {
                    this.addWarp(sectors[id1], sectors[id2]);
                }
            }
        }
    }

    // Add bidirectional warp connection
    addWarp(sector1, sector2) {
        if (!sector1.warps.includes(sector2.id)) {
            sector1.warps.push(sector2.id);
        }
        if (!sector2.warps.includes(sector1.id)) {
            sector2.warps.push(sector1.id);
        }
    }

    // Load existing galaxy
    load() {
        this.data = Utils.storage.get('galaxy');
        return this.data;
    }

    // Get sector by ID
    getSector(id) {
        return this.data?.sectors[id] || null;
    }

    // Get sectors with planets
    getPlanetSectors() {
        if (!this.data) return [];

        return Object.values(this.data.sectors).filter(sector =>
            sector.contents.some(c => c.type === 'planet')
        );
    }

    // Get sectors with stations
    getStationSectors() {
        if (!this.data) return [];

        return Object.values(this.data.sectors).filter(sector =>
            sector.contents.some(c => c.type === 'station')
        );
    }

    // Find nearest sector with specific content type
    findNearest(fromSectorId, contentType) {
        if (!this.data) return null;

        const fromSector = this.getSector(fromSectorId);
        if (!fromSector) return null;

        let nearest = null;
        let minDist = Infinity;

        for (const sector of Object.values(this.data.sectors)) {
            if (sector.contents.some(c => c.type === contentType)) {
                const dist = Utils.distance(
                    fromSector.x, fromSector.y,
                    sector.x, sector.y
                );

                if (dist < minDist) {
                    minDist = dist;
                    nearest = sector;
                }
            }
        }

        return nearest;
    }

    // Get path between two sectors (simple BFS)
    findPath(startId, endId) {
        if (!this.data) return null;

        const queue = [[startId]];
        const visited = new Set([startId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const current = path[path.length - 1];

            if (current === endId) {
                return path;
            }

            const sector = this.getSector(current);
            if (!sector) continue;

            for (const warp of sector.warps) {
                if (!visited.has(warp)) {
                    visited.add(warp);
                    queue.push([...path, warp]);
                }
            }
        }

        return null; // No path found
    }

    // Update planet/station economy (fluctuate prices)
    updateEconomy() {
        if (!this.data || !this.data.sectors) return;

        for (const sector of Object.values(this.data.sectors)) {
            if (!sector.contents) continue;

            for (const content of sector.contents) {
                // Update both planets and stations with economies
                if ((content.type === 'planet' || content.type === 'station') && content.economy) {
                    for (const commodity of CONSTANTS.COMMODITIES) {
                        const eco = content.economy[commodity];
                        if (!eco || !eco.buyPrice) continue; // Skip if doesn't trade this commodity

                        const economyData = CONSTANTS.ECONOMY[commodity];
                        if (!economyData) continue;

                        // Fluctuate prices slightly
                        eco.buyPrice = Math.round(
                            eco.buyPrice * Utils.random.float(0.95, 1.05)
                        );
                        eco.sellPrice = Math.round(
                            eco.sellPrice * Utils.random.float(0.95, 1.05)
                        );

                        // Clamp to reasonable ranges
                        const base = economyData.basePrice;
                        eco.buyPrice = Utils.clamp(eco.buyPrice, base * 0.5, base * 2);
                        eco.sellPrice = Utils.clamp(eco.sellPrice, base * 0.3, base * 1.5);
                    }
                }
            }
        }

        Utils.storage.set('galaxy', this.data);
    }

    // Get galaxy statistics
    getStats() {
        if (!this.data) return null;

        const sectors = Object.values(this.data.sectors);
        return {
            totalSectors: this.data.size,
            planetsCount: sectors.filter(s => s.contents.some(c => c.type === 'planet')).length,
            stationsCount: sectors.filter(s => s.contents.some(c => c.type === 'station')).length,
            debrisCount: sectors.filter(s => s.contents.some(c => c.type === 'debris')).length,
            emptySectors: sectors.filter(s => s.contents.length === 0).length,
            averageConnections: sectors.reduce((sum, s) => sum + s.warps.length, 0) / sectors.length
        };
    }

    // Generate deterministic daily prices for a commodity
    // Prices change daily but remain consistent for all players on the same day
    static generateDailyPrice(planet, commodity, dateString = null) {
        if (!planet || !commodity) return null;

        const date = dateString || new Date().toDateString();
        const economyData = CONSTANTS.ECONOMY[commodity];

        // Create a deterministic seed from date, planet name, and commodity
        const seedString = `${date}-${planet.name}-${commodity}`;
        const rng = new Utils.SeededRandom(seedString);

        let basePrice = economyData.basePrice;

        // Specialty items are always cheaper
        if (commodity === planet.specialty) {
            basePrice *= 0.7;
        } else {
            // Daily variance: 80-150% of base price
            basePrice *= rng.float(0.8, 1.5);
        }

        // Generate buy and sell prices for today
        const buyPrice = Math.round(basePrice * rng.float(1.1, 1.3));
        const sellPrice = Math.round(basePrice * rng.float(0.7, 0.9));

        return { buyPrice, sellPrice };
    }

    // Get current prices for all commodities on a planet
    static getPlanetPrices(planet, dateString = null) {
        if (!planet || !planet.economy) return null;

        const prices = {};
        for (const commodity of Object.keys(planet.economy)) {
            prices[commodity] = Galaxy.generateDailyPrice(planet, commodity, dateString);
        }
        return prices;
    }
    // Inject legendary Sci-Fi locations
    embedSciFiLore(sectors, size, rng) {
        console.log('Injecting Sci-Fi Lore...');

        const setSector = (id, contentData) => {
            if (!sectors[id]) return; // Sector doesn't exist (map too small)

            // Clear existing content
            sectors[id].contents = [];

            if (contentData.type === 'planet') {
                const planet = this.generatePlanet(rng);
                planet.name = contentData.name;
                planet.planetType = contentData.planetType || planet.planetType;
                if (contentData.description) planet.description = contentData.description;
                if (contentData.specialty) planet.specialty = contentData.specialty;

                // Recalculate economy based on new specialty if needed
                if (contentData.recalcEconomy) {
                    // Reset economy
                    planet.economy = {};
                    // ... logic to simple-regen economy would go here, 
                    // but for now we rely on the main update loop or just leave it randomized
                    // Actually let's force the specialty locally
                    planet.specialty = contentData.specialty;
                }
                sectors[id].contents.push(planet);

            } else if (contentData.type === 'station') {
                const station = this.generateStation(rng);
                station.name = contentData.name;
                station.class = contentData.class || station.class;
                if (contentData.description) station.description = contentData.description;
                sectors[id].contents.push(station);
            }
        };

        // 1. Sector 1: Sol System (Earth)
        setSector(1, {
            name: 'Earth (Sol)',
            type: 'planet',
            planetType: 'Terran',
            specialty: 'Equipment',
            description: 'The cradle of humanity. Home of the Federation.'
        });

        // 2. Babylon 5 (Sector 5)
        setSector(5, {
            name: 'Babylon 5',
            type: 'station',
            class: 'Diplomatic',
            description: 'A diplomatic hub. The last best hope for peace.'
        });

        // 3. Tattooine (Random Desert)
        const desertId = rng.int(10, size);
        setSector(desertId, {
            name: 'Tatooine',
            type: 'planet',
            planetType: 'Desert',
            specialty: 'Ore', // Scavenging
            description: 'A harsh desert world with twin suns. Hazardous.'
        });

        // 4. Caprica (Random Urban)
        const capricaId = rng.int(10, size);
        if (capricaId !== desertId) {
            setSector(capricaId, {
                name: 'Caprica',
                type: 'planet',
                planetType: 'Urban',
                specialty: 'Equipment',
                description: 'A high-tech colony world. Beware of cylons.'
            });
        }

        // 5. Stardock (Sector 2 or nearby)
        setSector(2, {
            name: 'Stardock',
            type: 'station',
            class: 'Shipyard',
            description: 'Major fleet manufacturing facility.'
        });

        // 6. The Borg Cube (Random High Sector)
        const borgId = rng.int(Math.floor(size * 0.8), size);
        sectors[borgId].contents.push({
            type: 'debris',
            name: 'Borg Debris Field',
            description: 'Remnants of a cubic vessel. Resistance was futile.'
        });

        // 7. Magrathea (Sector 42)
        setSector(42, {
            name: 'Magrathea',
            type: 'planet',
            planetType: 'Industrial',
            specialty: 'Luxury',
            description: 'Ancient planet-building facility. Currently closed for recession.'
        });

        // 8. Stargate Command (Random)
        const gateId = rng.int(5, size);
        sectors[gateId].contents.push({
            type: 'anomaly',
            name: 'Chappa\'ai (Stargate)',
            description: 'An ancient ring device of unknown origin.'
        });
    }
}
export default Galaxy;