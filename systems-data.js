// EVE Frontier Solar Systems Data
// This file contains static data for all solar systems in the game
// Since system names and locations never change, we can use this instead of API calls

const EVE_FRONTIER_SYSTEMS = {
    // High Security Systems (0.5-1.0)
    "Jita": { id: "jita_001", security: 0.9, region: "The Forge", coordinates: { x: 0, y: 0, z: 0 } },
    "Amarr": { id: "amarr_001", security: 0.9, region: "Domain", coordinates: { x: 1000, y: 1000, z: 1000 } },
    "Dodixie": { id: "dodixie_001", security: 0.8, region: "Placid", coordinates: { x: 2000, y: 2000, z: 2000 } },
    "Rens": { id: "rens_001", security: 0.8, region: "Heimatar", coordinates: { x: 3000, y: 3000, z: 3000 } },
    "Hek": { id: "hek_001", security: 0.7, region: "Metropolis", coordinates: { x: 4000, y: 4000, z: 4000 } },
    
    // Medium Security Systems (0.1-0.4)
    "Perimeter": { id: "perimeter_001", security: 0.4, region: "The Forge", coordinates: { x: 5000, y: 5000, z: 5000 } },
    "Urlen": { id: "urlen_001", security: 0.3, region: "Placid", coordinates: { x: 6000, y: 6000, z: 6000 } },
    "Maurasi": { id: "maurasi_001", security: 0.2, region: "Heimatar", coordinates: { x: 7000, y: 7000, z: 7000 } },
    "Sasta": { id: "sasta_001", security: 0.1, region: "Metropolis", coordinates: { x: 8000, y: 8000, z: 8000 } },
    
    // Low Security Systems (0.0)
    "Tama": { id: "tama_001", security: 0.0, region: "Placid", coordinates: { x: 9000, y: 9000, z: 9000 } },
    "Rancer": { id: "rancer_001", security: 0.0, region: "Heimatar", coordinates: { x: 10000, y: 10000, z: 10000 } },
    "Eha": { id: "eha_001", security: 0.0, region: "Metropolis", coordinates: { x: 11000, y: 11000, z: 11000 } }
};

// Real Ore Types from EVE Frontier Item List
const ORE_TYPES = {
    "Common Ore": {
        id: "77800",
        description: "Basic ore types found in high-security space",
        examples: ["Common Ore", "Rich Common Ore"],
        security_requirement: 0.5,
        mass: 2850,
        volume: 1,
        portionSize: 10000
    },
    "Carbonaceous Ore": {
        id: "77811", 
        description: "Carbon-rich ore types, valuable for manufacturing",
        examples: ["Carbonaceous Ore"],
        security_requirement: 0.3,
        mass: 1550,
        volume: 1,
        portionSize: 10000
    },
    "Metal Rich Ore": {
        id: "77810",
        description: "High-metal content ore, excellent for shipbuilding",
        examples: ["Metal-rich Ore"],
        security_requirement: 0.2,
        mass: 6925,
        volume: 1,
        portionSize: 10000
    },
    "Deep-Core Metallic Ore": {
        id: "78426",
        description: "Rare metallic ore found in deep space",
        examples: ["Deep-Core Metallic Ore"],
        security_requirement: 0.1,
        mass: 8200,
        volume: 1,
        portionSize: 10000
    },
    "Deep-Core Carbon Ore": {
        id: "78429",
        description: "Exotic carbon-based materials from wormholes",
        examples: ["Deep-Core Carbon Ore"],
        security_requirement: 0.0,
        mass: 2000,
        volume: 1,
        portionSize: 10000
    },
    "Core Aestasium": {
        id: "78446",
        description: "Synthetic and natural aestasium core materials",
        examples: ["Adaptive Core Aestasium", "Agile Core Aestasium", "Solidifying Core Aestasium", "Hardened Core Aestasium"],
        security_requirement: 0.1,
        mass: 1500,
        volume: 1,
        portionSize: 10000
    },
    "Core Hermetite": {
        id: "78450",
        description: "Synthetic hermetite core materials",
        examples: ["Fluid Core Hermetite", "Crystallizing Core Hermetite", "Stale Core Hermetite", "Sediment Core Hermetite"],
        security_requirement: 0.1,
        mass: 4000,
        volume: 1,
        portionSize: 10000
    },
    "Crude Matter": {
        id: "77729",
        description: "Raw crude matter from rift anomalies",
        examples: ["Old Crude Matter", "Young Crude Matter", "Defiled Crude Matter"],
        security_requirement: 0.0,
        mass: 1100,
        volume: 1,
        portionSize: 10000
    },
    "Special Materials": {
        id: "87375",
        description: "Rare and special materials",
        examples: ["Rich Common Ore", "Unrefined Radiantium"],
        security_requirement: 0.0,
        mass: 1201,
        volume: 1,
        portionSize: 10
    }
};

// Helper functions
function getSystemByName(name) {
    return EVE_FRONTIER_SYSTEMS[name] || null;
}

function searchSystems(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [systemName, systemData] of Object.entries(EVE_FRONTIER_SYSTEMS)) {
        if (systemName.toLowerCase().includes(queryLower)) {
            results.push({
                name: systemName,
                ...systemData
            });
        }
    }
    
    return results.slice(0, 10); // Limit to 10 results
}

function getSystemsBySecurity(minSecurity, maxSecurity = 1.0) {
    return Object.entries(EVE_FRONTIER_SYSTEMS)
        .filter(([name, data]) => data.security >= minSecurity && data.security <= maxSecurity)
        .map(([name, data]) => ({
            name,
            ...data
        }));
}

function getOreTypeByName(name) {
    return ORE_TYPES[name] || null;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EVE_FRONTIER_SYSTEMS,
        ORE_TYPES,
        getSystemByName,
        searchSystems,
        getSystemsBySecurity,
        getOreTypeByName
    };
}
