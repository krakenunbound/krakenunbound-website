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

    // Get vendor reaction to purchase
    generatePurchaseResponse(itemName, quantity) {
        const responses = [
            `Excellent choice! ${quantity} units of ${itemName} coming right up.`,
            `${itemName}? Good eye! Loading ${quantity} units now.`,
            `Smart buy! That's ${quantity} ${itemName} for you.`,
            `You got it! ${quantity} ${itemName} on the way.`,
            `Done! ${quantity} units of ${itemName} transferred.`,
            `Pleasure doing business! ${itemName} loaded up.`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Get vendor reaction to sale
    generateSaleResponse(itemName, quantity) {
        const responses = [
            `I'll take all ${quantity} units! Fair price for ${itemName}.`,
            `${itemName}! Been looking for that. ${quantity} units sold!`,
            `Good haul! ${quantity} ${itemName} purchased.`,
            `Deal! ${quantity} units of ${itemName} acquired.`,
            `Much obliged! ${itemName} fetches a good price here.`,
            `Excellent! Always need more ${itemName}.`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

export default VendorDialogue;