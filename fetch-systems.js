const fs = require('fs');
const https = require('https');

// Function to fetch solar systems from EVE Frontier API
async function fetchSolarSystems(offset = 0, limit = 1000) {
    return new Promise((resolve, reject) => {
        const url = `https://world-api-stillness.live.tech.evefrontier.com/v2/solarsystems?limit=${limit}&offset=${offset}`;
        
        const request = https.get(url, {
            headers: {
                'accept': 'application/json'
            }
        }, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    if (response.statusCode === 200) {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } else {
                        reject(new Error(`HTTP error! status: ${response.statusCode}`));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        request.on('error', (error) => {
            reject(error);
        });
        
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Function to fetch all solar systems
async function fetchAllSolarSystems() {
    const allSystems = {};
    const totalSystems = 24502;
    const limit = 1000;
    const totalCalls = Math.ceil(totalSystems / limit);
    
    console.log(`Starting to fetch ${totalSystems} solar systems in ${totalCalls} API calls...`);
    
    for (let i = 0; i < totalCalls; i++) {
        const offset = i * limit;
        console.log(`Fetching batch ${i + 1}/${totalCalls} (offset: ${offset})...`);
        
        const batchData = await fetchSolarSystems(offset, limit);
        
        if (batchData && batchData.data) {
            // Process each system in the batch
            batchData.data.forEach(system => {
                allSystems[system.name] = {
                    id: system.id,
                    constellationId: system.constellationId,
                    regionId: system.regionId,
                    coordinates: {
                        x: system.location.x,
                        y: system.location.y,
                        z: system.location.z
                    }
                };
            });
            
            console.log(`Batch ${i + 1} completed. Total systems collected: ${Object.keys(allSystems).length}`);
        } else {
            console.error(`Failed to fetch batch ${i + 1}`);
        }
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allSystems;
}

// Function to generate the systems-data.js file
function generateSystemsDataFile(systems) {
    const fileContent = `// EVE Frontier Solar Systems Data
// This file contains static data for all solar systems in the game
// Since system names and locations never change, we can use this instead of API calls
// Total systems: ${Object.keys(systems).length}

const EVE_FRONTIER_SYSTEMS = ${JSON.stringify(systems, null, 2)};

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

function getSystemsByRegion(regionId) {
    return Object.entries(EVE_FRONTIER_SYSTEMS)
        .filter(([name, data]) => data.regionId === regionId)
        .map(([name, data]) => ({
            name,
            ...data
        }));
}

function getSystemsByConstellation(constellationId) {
    return Object.entries(EVE_FRONTIER_SYSTEMS)
        .filter(([name, data]) => data.constellationId === constellationId)
        .map(([name, data]) => ({
            name,
            ...data
        }));
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EVE_FRONTIER_SYSTEMS,
        getSystemByName,
        searchSystems,
        getSystemsByRegion,
        getSystemsByConstellation
    };
}
`;

    return fileContent;
}

// Main execution
async function main() {
    try {
        console.log('Starting EVE Frontier Solar Systems data collection...');
        
        const systems = await fetchAllSolarSystems();
        
        if (Object.keys(systems).length > 0) {
            console.log(`Successfully collected ${Object.keys(systems).length} solar systems`);
            
            const fileContent = generateSystemsDataFile(systems);
            
            // Write to systems-data.js
            fs.writeFileSync('systems-data.js', fileContent);
            console.log('systems-data.js file has been created successfully!');
            
            // Also create a backup JSON file
            fs.writeFileSync('systems-data-backup.json', JSON.stringify(systems, null, 2));
            console.log('systems-data-backup.json backup file has been created!');
            
        } else {
            console.error('No systems were collected. Please check the API and try again.');
        }
        
    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

// Run the script
main();
