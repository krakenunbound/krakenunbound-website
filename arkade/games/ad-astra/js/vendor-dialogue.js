// Ad Astra - Vendor Dialogue System
// vendor-dialogue.js - Typewriter effects and shop personality

class VendorDialogue {
    constructor() {
        this.currentTyping = null;
        this.typingSpeed = 30; // milliseconds per character
    }

    // Generate unique shop name based on location
    generateShopName(location) {
        const seed = this.hashString(location.name || 'Station');
        const rng = this.seededRandom(seed);
        
        const prefixes = [
            "The", "Honest", "Lucky", "Cosmic", "Star", "Nebula",
            "Quantum", "Warp", "Galactic", "Deep Space", "Frontier",
            "Captain's", "Trader's", "Merchant's"
        ];
        
        const names = [
            "Trade Post", "Emporium", "Supply Depot", "Trading Company",
            "Market", "Exchange", "Warehouse", "Outlet", "Hub",
            "General Store", "Commerce Center", "Bazaar"
        ];
        
        const prefix = prefixes[Math.floor(rng() * prefixes.length)];
        const name = names[Math.floor(rng() * names.length)];
        
        return `${prefix} ${name}`;
    }

    // Generate vendor personality/greeting
    generateVendorGreeting(shopName, playerName) {
        const greetings = [
            `Welcome to ${shopName}! What can I do for you today?`,
            `Ah, a customer! Welcome to ${shopName}. Need supplies?`,
            `Greetings, traveler. You've found ${shopName}. Looking to trade?`,
            `Welcome aboard! ${shopName} has what you need. What'll it be?`,
            `Hey there! ${shopName}, best prices in the sector. What can I get you?`,
            `Welcome to ${shopName}. Fresh off the hauler today!`,
            `Well met, friend. ${shopName} is open for business!`,
            `${shopName} at your service. What brings you here?`,
            `Another pilot looking for a deal! Welcome to ${shopName}.`,
            `Fair winds, traveler! ${shopName} has your supplies.`
        ];
        
        const seed = this.hashString(shopName);
        const rng = this.seededRandom(seed);
        const greeting = greetings[Math.floor(rng() * greetings.length)];
        
        return greeting;
    }

    // Typewriter effect - types out text character by character
    async typeText(text, element, speed = this.typingSpeed) {
        // Stop any existing typing
        if (this.currentTyping) {
            clearTimeout(this.currentTyping);
            this.currentTyping = null;
        }

        element.textContent = '';
        element.style.opacity = '1';
        
        let index = 0;
        
        return new Promise((resolve) => {
            const typeChar = () => {
                if (index < text.length) {
                    element.textContent += text[index];
                    index++;
                    this.currentTyping = setTimeout(typeChar, speed);
                } else {
                    this.currentTyping = null;
                    resolve();
                }
            };
            
            typeChar();
        });
    }

    // Skip to end of typing animation
    skipTyping(element, fullText) {
        if (this.currentTyping) {
            clearTimeout(this.currentTyping);
            this.currentTyping = null;
            element.textContent = fullText;
        }
    }

    // Hash string to number (for seeded random)
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Seeded random number generator
    seededRandom(seed) {
        let value = seed;
        return function() {
            value = (value * 9301 + 49297) % 233280;
            return value / 233280;
        };
    }

    // Get vendor farewell message
    generateFarewell(shopName) {
        const farewells = [
            "Safe travels!",
            "Come back soon!",
            "Good luck out there!",
            "Fly safe!",
            "May the stars guide you!",
            "Watch for pirates!",
            "Thanks for your business!",
            "Clear skies, pilot!"
        ];
        
        const seed = this.hashString(shopName);
        const rng = this.seededRandom(seed);
        return farewells[Math.floor(rng() * farewells.length)];
    }

    // Get vendor reaction to purchase - commodity-specific
    generatePurchaseResponse(commodity, quantity) {
        console.log('🛒 generatePurchaseResponse called:', { commodity, quantity });
        
        const commodityResponses = {
            'Ore': [
                `${quantity} units of ore, coming up! This is the good stuff from the asteroid belt.`,
                `Ore, eh? Building something? ${quantity} units loaded into your hold.`,
                `Raw materials are always in demand. ${quantity} ore transferred!`,
                `Heavy cargo, but valuable. ${quantity} units of ore are yours.`,
                `That's ${quantity} tons of quality ore. The foundries will love you!`,
                `Ore shipment ready! ${quantity} units. Mind your mass limits.`
            ],
            'Organics': [
                `${quantity} units of organics! Fresh from the hydroponic bays.`,
                `Organics, smart move. Colonies always need food. ${quantity} units packaged!`,
                `Farm-fresh! Well, station-fresh. ${quantity} organics loaded.`,
                `${quantity} units of premium organics. Keep 'em refrigerated!`,
                `Food runs are reliable money. ${quantity} organics in your hold!`,
                `Life support essentials! ${quantity} organic units transferred.`
            ],
            'Equipment': [
                `${quantity} units of equipment! All certified and calibrated.`,
                `Tech gear loaded. ${quantity} units of fine machinery.`,
                `Industrial equipment ready! ${quantity} units. Handle with care!`,
                `${quantity} equipment units. Everything from nav chips to hull plating.`,
                `Quality gear for quality pilots. ${quantity} units transferred!`,
                `Tools of the trade! ${quantity} equipment units loaded.`
            ],
            'Contraband': [
                `*glances around* ${quantity} units... loaded discreetly.`,
                `You didn't get this from me. ${quantity} units, no questions.`,
                `Keep it quiet. ${quantity} of the "special merchandise" is yours.`,
                `*lowers voice* ${quantity} units transferred. Watch for patrols.`,
                `Hot cargo for a hot pilot. ${quantity} units, keep moving.`,
                `${quantity} units loaded in hidden compartments. Stay frosty.`
            ]
        };

        const responses = commodityResponses[commodity] || [
            `${quantity} units loaded! Pleasure doing business.`,
            `There you go! ${quantity} units of ${commodity}.`,
            `Transaction complete! ${quantity} ${commodity} transferred.`
        ];
        
        const selected = responses[Math.floor(Math.random() * responses.length)];
        console.log('🛒 Selected response:', selected, 'from', responses.length, 'options');
        return selected;
    }

    // Get vendor reaction to sale - commodity-specific
    generateSaleResponse(commodity, quantity) {
        const commodityResponses = {
            'Ore': [
                `${quantity} units of ore? I'll take 'em! The smelters need this.`,
                `Good haul, pilot! ${quantity} ore units purchased. Nice find.`,
                `Ore is always welcome here. ${quantity} units? Sold!`,
                `The refineries will be happy. ${quantity} ore acquired!`,
                `Raw materials at a fair price. ${quantity} units accepted.`,
                `Solid trade! ${quantity} ore. Come back with more!`
            ],
            'Organics': [
                `${quantity} organics? The station's hungry! Sold!`,
                `Fresh supplies! ${quantity} organic units purchased. Nice run.`,
                `Colonists gotta eat. ${quantity} organics, fair price paid.`,
                `Food is always needed. ${quantity} units accepted gratefully.`,
                `Life support stocks replenished! ${quantity} organics bought.`,
                `Excellent! ${quantity} organics. The mess hall thanks you!`
            ],
            'Equipment': [
                `${quantity} equipment units? Let me check quality... Perfect!`,
                `Tech gear is always in demand. ${quantity} units purchased!`,
                `Good condition! ${quantity} equipment accepted.`,
                `The repair bays need parts. ${quantity} units? Deal!`,
                `${quantity} equipment. Fair market value paid!`,
                `Quality gear! ${quantity} units acquired. Good doing business.`
            ],
            'Contraband': [
                `*quickly hides merchandise* ${quantity} units... never happened.`,
                `Interesting cargo. ${quantity} units "acquired" quietly.`,
                `*winks* ${quantity} units of merchandise received.`,
                `The underground thanks you. ${quantity} units, fair black market price.`,
                `Hot goods cool down here. ${quantity} units absorbed into inventory.`,
                `*nods* ${quantity} units. You know how to find us.`
            ]
        };

        const responses = commodityResponses[commodity] || [
            `${quantity} units sold! Credits transferred.`,
            `Nice haul! ${quantity} units of ${commodity} purchased.`,
            `Transaction complete! ${quantity} ${commodity} accepted.`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

export default VendorDialogue;