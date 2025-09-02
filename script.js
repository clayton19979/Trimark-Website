// EVE Frontier Configuration
const EVE_FRONTIER_API_BASE = 'https://world-api-stillness.live.tech.evefrontier.com/v2';

// EVE Frontier Network Configuration
const EVE_FRONTIER_NETWORK = {
    chainId: '0xa9f1a1', // 695569 in hex
    chainName: 'EVE pyrope Game',
    nativeCurrency: {
        name: 'Gas',
        symbol: 'GAS',
        decimals: 18
    },
    rpcUrls: ['https://pyrope-external-sync-node-rpc.live.tech.evefrontier.com'],
    blockExplorerUrls: ['https://explorer.pyropechain.com']
};

// DOM Elements - will be initialized after DOM loads
let connectWalletBtn;
let userProfile;
let userPortrait;
let userName;
let userAddress;
let disconnectWalletBtn;
let navLinks;

// Admin Configuration
const ADMIN_WALLETS = [
    '0xd9a41d42240a7a2cf7f24138abb4a368759cd58a',
    '0x09cb1d426de396bbd90bd6198357d1f9df484281'
];

// Tribe Access Configuration
const REQUIRED_TRIBE_ID = 98000063;

// State Management
let currentAccount = null;
let provider = null;
let signer = null;
let isConnected = false;
let isConnecting = false;
let error = null;
let chainId = null;
let walletType = null;
let isAdmin = false;
let approvedUsers = [];
let tribeMembers = [];
let userRoles = {}; // Will now store arrays of roles for each user

// No hardcoded administrators - roles are assigned through the system

// Load user roles from localStorage
function loadUserRolesFromStorage() {
    const storedRoles = localStorage.getItem('trimark_user_roles');
    if (storedRoles) {
        try {
            userRoles = JSON.parse(storedRoles);
            console.log('✅ Loaded user roles from localStorage:', userRoles);
        } catch (error) {
            console.error('❌ Error parsing user roles from localStorage:', error);
            userRoles = {};
        }
    } else {
        console.log('ℹ️ No user roles found in localStorage, starting with empty object');
        
        // Add some test data if no roles exist (for testing purposes)
        if (Object.keys(userRoles).length === 0) {
            console.log('🧪 Adding test role data for demonstration...');
            userRoles = {
                'Spitzhacke': ['administrator', 'event_coordinator'],
                'TestUser1': ['diplomatic_officer'],
                'TestUser2': ['lead_tactician', 'field_survey_lead']
            };
            localStorage.setItem('trimark_user_roles', JSON.stringify(userRoles));
            console.log('✅ Test role data added:', userRoles);
        } else {
            console.log('📋 Using existing role data from localStorage:', userRoles);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Load user roles from localStorage
    loadUserRolesFromStorage();
    
    // Initialize DOM elements
    connectWalletBtn = document.getElementById('connectWallet');
    userProfile = document.getElementById('userProfile');
    userPortrait = document.getElementById('userPortrait');
    userName = document.getElementById('userName');
    userAddress = document.getElementById('userAddress');
    disconnectWalletBtn = document.getElementById('disconnectWallet');
    navLinks = document.querySelectorAll('.nav-link');
    
    console.log('DOM elements initialized:', {
        connectWalletBtn: !!connectWalletBtn,
        userProfile: !!userProfile,
        userPortrait: !!userPortrait,
        userName: !!userName,
        userAddress: !!userAddress,
        disconnectWalletBtn: !!disconnectWalletBtn
    });
    
    // Wait a bit for scripts to load
    setTimeout(() => {
        // Check for existing wallet connection from localStorage
        const walletConnected = localStorage.getItem('walletConnected');
        const walletAccount = localStorage.getItem('walletAccount');
        
        if (walletConnected && walletAccount) {
            console.log('🔌 Found existing wallet connection:', walletAccount);
            // Set the current account from localStorage
            currentAccount = walletAccount;
            isConnected = true;
            
            // Initialize the app with the existing connection
            initializeApp();
            setupEventListeners();
            
            // Fetch and display user data
            updateUserProfile();
            
                    // Load approved users (admin status check removed for testing)
        loadApprovedUsers();
            
            // Show main content since user is already connected
            showMainContent();
        } else {
            // No existing connection - show wallet connection prompt
            console.log('❌ No existing wallet connection found');
            
            // Initialize wallet button state
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Connect Wallet';
                connectWalletBtn.disabled = false;
            }
            
            // Setup event listeners for wallet connection
            setupEventListeners();
        }
        
        // Initialize page-specific functionality
        initializePageSpecificFunctions();
        
        // Debug: Check what role elements exist on the page
        setTimeout(() => {
            const allRoleTypes = document.querySelectorAll('.role-type');
            const clickableRoleTypes = document.querySelectorAll('.role-type.clickable');
            console.log('🔍 Debug: Found role elements:', {
                total: allRoleTypes.length,
                clickable: clickableRoleTypes.length,
                allElements: allRoleTypes,
                clickableElements: clickableRoleTypes
            });
        }, 2000);
        
    }, 1000);
});

// Initialize page-specific functionality
function initializePageSpecificFunctions() {
    const currentPage = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
    console.log('Current page detected:', currentPage);
    
    if (currentPage === 'roles.html' || window.location.href.includes('roles.html')) {
        console.log('Initializing Roles page...');
        console.log('🔍 Current page detected as roles.html');
        loadTribeMembers();
        setupRolesDisplay();
        // Role assignment moved to members page
    }
    
    if (currentPage === 'members.html' || window.location.href.includes('members.html')) {
        console.log('Initializing Members page...');
        loadTribeMembers();
        renderMembersList();
        setupMembersPageEventListeners();
        setupRoleAssignment(); // Add role assignment functionality to members page
    }
    
    if (currentPage === 'ore-sites.html' || window.location.href.includes('ore-sites.html')) {
        console.log('Initializing Ore Sites page...');
        // Ore sites functionality is handled by the embedded script in ore-sites.html
    }
}

// Get role display information
function getRoleDisplayInfo(role) {
    const roleInfo = {
        'administrator': {
            display: '👑 Administrator',
            name: 'Administrator'
        },
        'diplomatic_officer': {
            display: '🤝 Diplomatic Officer',
            name: 'Diplomatic Officer'
        },
        'lead_tactician': {
            display: '⚔️ Lead Tactician',
            name: 'Lead Tactician'
        },
        'field_survey_lead': {
            display: '🔍 Field Survey Lead',
            name: 'Field Survey Lead'
        },
        'recruiter': {
            display: '📢 Recruiter',
            name: 'Recruiter'
        },
        'ambassador': {
            display: '🌐 Ambassador',
            name: 'Ambassador'
        },
        'crew_member': {
            display: '👥 Crew Member',
            name: 'Crew Member'
        },
        'event_coordinator': {
            display: '📅 Event Coordinator',
            name: 'Event Coordinator'
        },
        'member': {
            display: '👥 Crew Member',
            name: 'Crew Member'
        }
    };
    
    return roleInfo[role] || roleInfo['member'];
}

// Load tribe members from API
async function loadTribeMembers() {
    try {
        console.log('🔄 Loading tribe members from API...');
        const response = await fetch(`${EVE_FRONTIER_API_BASE}/tribes/${REQUIRED_TRIBE_ID}?format=json`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        tribeMembers = data.members || [];
        console.log(`✅ Loaded ${tribeMembers.length} tribe members from Trimark Industries`);
        console.log('First few tribe members:', tribeMembers.slice(0, 3));
        
        // Update tribe member count display if it exists
        const memberCountDisplay = document.getElementById('tribeMemberCount');
        if (memberCountDisplay) {
            memberCountDisplay.textContent = tribeMembers.length;
        }
        
        // Setup player search with the loaded tribe members (only for members page)
        if (window.location.pathname.includes('members.html')) {
            setupPlayerSearch();
            renderMembersList();
        }
        
        return tribeMembers;
        
    } catch (error) {
        console.error('❌ Error loading tribe members:', error);
        tribeMembers = [];
        return [];
    }
}

// Refresh tribe members data
async function refreshTribeMembers() {
    console.log('🔄 Refreshing tribe members...');
    await loadTribeMembers();
    // Re-setup player search with fresh data
    setupPlayerSearch();
    alert(`Refreshed tribe member data. Current member count: ${tribeMembers.length}`);
}

// Setup player search for role assignment
function setupPlayerSearch() {
    const roleUserNameInput = document.getElementById('roleUserName');
    if (!roleUserNameInput) {
        console.log('Role username input not found, retrying in 1 second...');
        setTimeout(setupPlayerSearch, 1000);
        return;
    }
    
    console.log('Setting up player search for role assignment...');
    console.log('Current tribe members:', tribeMembers);
    
    // Remove existing search container if it exists
    const existingContainer = document.querySelector('.player-search-container');
    if (existingContainer) {
        existingContainer.remove();
    }
    
    // Create search container
    let searchContainer = document.createElement('div');
    searchContainer.className = 'player-search-container';
    searchContainer.style.display = 'none';
    searchContainer.style.position = 'absolute';
    searchContainer.style.zIndex = '1000';
    searchContainer.style.left = '0';
    searchContainer.style.top = '100%';
    searchContainer.style.width = '100%';
    searchContainer.style.backgroundColor = '#1a1a1a';
    searchContainer.style.border = '1px solid #333';
    searchContainer.style.borderRadius = '4px';
    searchContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    searchContainer.style.maxHeight = '200px';
    searchContainer.style.overflowY = 'auto';
    
    // Position the search container relative to the input field
    const inputRect = roleUserNameInput.getBoundingClientRect();
    searchContainer.style.position = 'fixed';
    searchContainer.style.left = inputRect.left + 'px';
    searchContainer.style.top = (inputRect.bottom + 5) + 'px';
    searchContainer.style.width = inputRect.width + 'px';
    document.body.appendChild(searchContainer);
    
    // Add input event listener
    roleUserNameInput.addEventListener('input', function() {
        const inputValue = this.value.toLowerCase().trim();
        console.log('Search input:', inputValue, 'Tribe members count:', tribeMembers ? tribeMembers.length : 'undefined');
        
        // Update search container position
        const inputRect = roleUserNameInput.getBoundingClientRect();
        searchContainer.style.left = inputRect.left + 'px';
        searchContainer.style.top = (inputRect.bottom + 5) + 'px';
        searchContainer.style.width = inputRect.width + 'px';
        
        // Check if tribe members are loaded
        if (!tribeMembers || tribeMembers.length === 0) {
            console.log('No tribe members loaded yet, loading them now...');
            searchContainer.innerHTML = '<div class="search-item"><span class="member-name">Loading tribe members...</span></div>';
            searchContainer.style.display = 'block';
            
            loadTribeMembers().then(() => {
                // Re-trigger the input event after loading
                this.dispatchEvent(new Event('input'));
            });
            return;
        }
        
        if (inputValue.length < 1) {
            searchContainer.style.display = 'none';
            return;
        }
        
        // Filter tribe members that match the input
        const matches = tribeMembers.filter(member => 
            member.name.toLowerCase().includes(inputValue)
        ).slice(0, 8); // Limit to 8 suggestions
        
        console.log('Search matches found:', matches.length, 'Matches:', matches);
        
        if (matches.length > 0) {
            searchContainer.innerHTML = matches.map(member => 
                `<div class="search-item" data-name="${member.name}" data-address="${member.address}">
                    <span class="member-name">${member.name}</span>
                    <span class="member-address">${member.address.slice(0, 6)}...${member.address.slice(-4)}</span>
                </div>`
            ).join('');
            
            searchContainer.style.display = 'block';
            
            // Add click handlers to suggestions
            searchContainer.querySelectorAll('.search-item').forEach(item => {
                item.addEventListener('click', function() {
                    const selectedName = this.getAttribute('data-name');
                    const selectedAddress = this.getAttribute('data-address');
                    roleUserNameInput.value = selectedName;
                    
                    // Store the selected address for later use
                    roleUserNameInput.dataset.selectedAddress = selectedAddress;
                    
                    searchContainer.style.display = 'none';
                    console.log('Selected player:', selectedName, 'Address:', selectedAddress);
                });
            });
        } else {
            searchContainer.innerHTML = '<div class="search-item"><span class="member-name">No matching players found</span></div>';
            searchContainer.style.display = 'block';
        }
    });
    
    // Hide search when clicking outside
    document.addEventListener('click', function(e) {
        if (!roleUserNameInput.contains(e.target) && !searchContainer.contains(e.target)) {
            searchContainer.style.display = 'none';
        }
    });
    
    // Reposition search container on focus
    roleUserNameInput.addEventListener('focus', function() {
        const inputRect = roleUserNameInput.getBoundingClientRect();
        searchContainer.style.left = inputRect.left + 'px';
        searchContainer.style.top = (inputRect.bottom + 5) + 'px';
        searchContainer.style.width = inputRect.width + 'px';
    });
    
    // Hide search on focus out
    roleUserNameInput.addEventListener('blur', function() {
        setTimeout(() => {
            searchContainer.style.display = 'none';
        }, 200);
    });
    
    // Handle window resize to reposition search container
    window.addEventListener('resize', function() {
        if (searchContainer.style.display !== 'none') {
            const inputRect = roleUserNameInput.getBoundingClientRect();
            searchContainer.style.left = inputRect.left + 'px';
            searchContainer.style.top = (inputRect.bottom + 5) + 'px';
            searchContainer.style.width = inputRect.width + 'px';
        }
    });
    
    console.log('Player search setup complete');
}

// Render members list for the members page
function renderMembersList() {
    const membersList = document.getElementById('membersList');
    const totalMemberCount = document.getElementById('totalMemberCount');
    
    if (!membersList || !totalMemberCount) return;
    
    if (!tribeMembers || tribeMembers.length === 0) {
        membersList.innerHTML = '<div class="no-members">Loading tribe members...</div>';
        totalMemberCount.textContent = '0';
        return;
    }
    
    // Sort members by name by default
    tribeMembers.sort((a, b) => a.name.localeCompare(b.name));
    
    // Update total count
    totalMemberCount.textContent = tribeMembers.length;
    
    // Render members
    membersList.innerHTML = tribeMembers.map(member => {
        return `
            <div class="member-item clickable" data-name="${member.name.toLowerCase()}" data-member="${member.name}">
                <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
                <div class="member-details">
                    <div class="member-name">${member.name}</div>
                    <div class="member-address">${member.address.slice(0, 6)}...${member.address.slice(-4)}</div>
                    <div class="member-roles" id="member-roles-${member.name}">
                        <!-- Member roles will be displayed here -->
                    </div>
                </div>
                <div class="member-actions">
                    <button class="assign-role-btn" onclick="showRoleAssignmentModal('${member.name}')" title="Assign role to ${member.name}">
                        👑 Assign Role
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Display current roles for each member
    displayMemberRoles();
    
    // Setup click handlers for role assignment
    setupMemberRoleAssignment();
}

// Setup event listeners for the members page
function setupMembersPageEventListeners() {
    const memberSearchInput = document.getElementById('memberSearchInput');
    const memberSortSelect = document.getElementById('memberSortSelect');
    
    if (memberSearchInput) {
        memberSearchInput.addEventListener('input', function() {
            filterMembers(this.value);
        });
    }
    
    if (memberSortSelect) {
        memberSortSelect.addEventListener('change', function() {
            sortMembers(this.value);
        });
    }
}

// Filter members by search term
function filterMembers(searchTerm) {
    const memberItems = document.querySelectorAll('.member-item');
    const searchLower = searchTerm.toLowerCase();
    
    memberItems.forEach(item => {
        const memberName = item.querySelector('.member-name').textContent.toLowerCase();
        const memberAddress = item.querySelector('.member-address').textContent.toLowerCase();
        
        if (memberName.includes(searchLower) || memberAddress.includes(searchLower)) {
            item.style.display = 'grid';
        } else {
            item.style.display = 'none';
        }
    });
}

// Sort members by different criteria
function sortMembers(sortBy) {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;
    
    const memberItems = Array.from(membersList.querySelectorAll('.member-item'));
    
    memberItems.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                const nameA = a.querySelector('.member-name').textContent;
                const nameB = b.querySelector('.member-name').textContent;
                return nameA.localeCompare(nameB);
                
            case 'joinDate':
                // Join date sorting removed - no accurate data available
                return 0;
                
            default:
                return 0;
        }
    });
    
    // Re-append sorted items
    memberItems.forEach(item => membersList.appendChild(item));
}

// Basic wallet connection functions (simplified)
function setupEventListeners() {
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
    
    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', disconnectWallet);
    }
}

function initializeApp() {
    console.log('Initializing app...');
    // Basic initialization
}

function connectWallet() {
    console.log('Connecting wallet...');
    // Simplified wallet connection
}

function disconnectWallet() {
    console.log('Disconnecting wallet...');
    // Simplified wallet disconnection
}

function updateUserProfile() {
    console.log('Updating user profile...');
    // Simplified profile update
}

function loadApprovedUsers() {
    console.log('Loading approved users...');
    // Simplified user loading
}



function showMainContent() {
    console.log('Showing main content...');
    // Simplified content display
}

// Setup roles display for the roles page
function setupRolesDisplay() {
    console.log('Setting up roles display...');
    
    // Migrate role format if needed
    migrateRoleFormat();
    
    // Debug: Check current userRoles state
    console.log('🔍 Current userRoles after migration:', userRoles);
    console.log('🔍 userRoles type:', typeof userRoles);
    console.log('🔍 userRoles keys:', Object.keys(userRoles));
    
    // Wait a moment for DOM to be fully ready, then setup clickable role types
    setTimeout(() => {
        setupClickableRoles();
    }, 100);
    
    // No need to load current roles display - this is now handled by clickable roles
    console.log('✅ Roles display setup complete - click on any role box to see who holds it');
}

// Setup clickable role types
function setupClickableRoles() {
    const roleTypes = document.querySelectorAll('.role-type.clickable');
    console.log(`🔍 Found ${roleTypes.length} clickable role types:`, roleTypes);
    
    if (roleTypes.length === 0) {
        console.log('❌ No clickable role types found! Checking for .role-type elements...');
        const allRoleTypes = document.querySelectorAll('.role-type');
        console.log(`🔍 Found ${allRoleTypes.length} total .role-type elements:`, allRoleTypes);
        
        // Check if the clickable class is missing
        allRoleTypes.forEach(roleType => {
            if (!roleType.classList.contains('clickable')) {
                console.log(`⚠️ Role type missing 'clickable' class:`, roleType);
            }
        });
        return;
    }
    
    roleTypes.forEach(roleType => {
        const role = roleType.getAttribute('data-role');
        console.log(`🎯 Setting up click handler for role: ${role}`);
        
        // Add a visual indicator that this is clickable
        roleType.style.borderColor = 'rgba(0, 212, 255, 0.6)';
        roleType.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.3)';
        
        roleType.addEventListener('click', function() {
            console.log(`🖱️ Clicked on role: ${role}`);
            toggleRoleHolders(role);
        });
    });
    
    console.log('✅ Clickable role setup complete');
}

// Toggle role holders display
function toggleRoleHolders(role) {
    console.log(`🔄 Toggling role holders for: ${role}`);
    const holdersElement = document.getElementById(`holders-${role}`);
    if (!holdersElement) {
        console.log(`❌ Holders element not found for role: ${role}`);
        return;
    }
    
    console.log(`✅ Found holders element:`, holdersElement);
    
    // Check if holders are already loaded
    if (holdersElement.querySelector('.role-holders-list')) {
        // Toggle visibility
        const list = holdersElement.querySelector('.role-holders-list');
        const newDisplay = list.style.display === 'none' ? 'block' : 'none';
        list.style.display = newDisplay;
        console.log(`🔄 Toggled visibility to: ${newDisplay}`);
        return;
    }
    
    // Load and display holders for this role
    console.log(`📋 Loading role holders for: ${role}`);
    displayRoleHolders(role, holdersElement);
}

// Display role holders for a specific role
function displayRoleHolders(role, holdersElement) {
    console.log(`📋 Displaying role holders for: ${role}`);
    console.log(`🔍 Current userRoles:`, userRoles);
    
    const holders = [];
    
    // Find all users with this role
    for (const [userName, userRoleArray] of Object.entries(userRoles)) {
        if (Array.isArray(userRoleArray) && userRoleArray.includes(role)) {
            holders.push(userName);
            console.log(`✅ Found user with role: ${userName} has ${role}`);
        } else if (userRoleArray === role) {
            // Handle old single-role format
            holders.push(userName);
            console.log(`✅ Found user with old format role: ${userName} has ${role}`);
        }
    }
    
    // Special handling for member role (crew member display)
    if (role === 'member') {
        console.log(`🔍 Special handling for member role (crew member)`);
        // Check if any users don't have specific roles assigned (they get member role by default)
        for (const member of tribeMembers) {
            if (!userRoles[member.name] || userRoles[member.name].length === 0) {
                holders.push(member.name);
                console.log(`✅ Found user with default crew member role: ${member.name}`);
            }
        }
    }
    
    console.log(`📊 Total holders found: ${holders.length}`, holders);
    
    if (holders.length === 0) {
        holdersElement.innerHTML = '<span class="holders-label">No one currently holds this role</span>';
        console.log(`ℹ️ No holders found for role: ${role}`);
        return;
    }
    
    const holdersHTML = `
        <div class="role-holders-list">
            ${holders.map(userName => `
                <div class="role-holder-item">
                    <span class="role-holder-name">${userName}</span>
                    <div class="role-holder-actions">
                        <button onclick="removeRoleFromUser('${userName}', '${role}')" title="Remove ${role} from ${userName}">
                            🗑️ Remove
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    holdersElement.innerHTML = holdersHTML;
    console.log(`✅ Role holders displayed for: ${role}`);
}

// Remove role from user (called from role holders display)
function removeRoleFromUser(userName, role) {
    if (confirm(`Are you sure you want to remove the "${role}" role from ${userName}?`)) {
        deleteRole(userName, role);
        // Refresh the role holders display
        const holdersElement = document.getElementById(`holders-${role}`);
        if (holdersElement) {
            displayRoleHolders(role, holdersElement);
        }
    }
}

// Setup role assignment for the members page
function setupRoleAssignment() {
    console.log('Setting up role assignment on members page...');
    
    // Migrate role format if needed
    migrateRoleFormat();
    
    // Add click handlers to member items for role assignment
    setupMemberRoleAssignment();
}

// Setup member role assignment
function setupMemberRoleAssignment() {
    // This will be called after members are rendered
    console.log('Member role assignment setup ready');
}

// Display roles for each member
function displayMemberRoles() {
    tribeMembers.forEach(member => {
        const rolesElement = document.getElementById(`member-roles-${member.name}`);
        if (rolesElement) {
            const memberRoles = userRoles[member.name];
            if (memberRoles && Array.isArray(memberRoles) && memberRoles.length > 0) {
                const rolesHTML = memberRoles.map(role => {
                    const roleInfo = getRoleDisplayInfo(role);
                    return `<span class="member-role-badge">${roleInfo.display}</span>`;
                }).join('');
                rolesElement.innerHTML = rolesHTML;
            } else if (memberRoles && !Array.isArray(memberRoles)) {
                // Handle old single-role format
                const roleInfo = getRoleDisplayInfo(memberRoles);
                rolesElement.innerHTML = `<span class="member-role-badge">${roleInfo.display}</span>`;
                    } else {
            // Automatically assign member role (which now uses crew member icon)
            if (!userRoles[member.name]) {
                userRoles[member.name] = ['member'];
                localStorage.setItem('trimark_user_roles', JSON.stringify(userRoles));
                console.log(`✅ Automatically assigned crew member role to ${member.name}`);
            }
            rolesElement.innerHTML = '<span class="member-role-badge no-role">👥 Crew Member</span>';
        }
        }
    });
}

// Show role assignment modal
function showRoleAssignmentModal(memberName) {
    // Create modal HTML
    const modalHTML = `
        <div id="roleAssignmentModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Assign Role to ${memberName}</h3>
                    <button onclick="closeRoleAssignmentModal()" class="close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="modalRoleSelect">Select Role</label>
                        <select id="modalRoleSelect" class="role-select">
                            <option value="">Choose a role...</option>
                            <option value="administrator">👑 Administrator</option>
                            <option value="diplomatic_officer">🤝 Diplomatic Officer</option>
                            <option value="lead_tactician">⚔️ Lead Tactician</option>
                            <option value="field_survey_lead">🔍 Field Survey Lead</option>
                            <option value="recruiter">📢 Recruiter</option>
                            <option value="ambassador">🌐 Ambassador</option>
                            <option value="event_coordinator">📅 Event Coordinator</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="modalRoleReason">Reason for Assignment</label>
                        <textarea id="modalRoleReason" placeholder="Explain why this role is being assigned..." class="role-textarea"></textarea>
                    </div>
                    <div class="modal-actions">
                        <button onclick="assignRoleToMember('${memberName}')" class="role-btn primary">Assign Role</button>
                        <button onclick="closeRoleAssignmentModal()" class="role-btn secondary">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close role assignment modal
function closeRoleAssignmentModal() {
    const modal = document.getElementById('roleAssignmentModal');
    if (modal) {
        modal.remove();
    }
}

// Assign role to member from modal
function assignRoleToMember(memberName) {
    const roleSelect = document.getElementById('modalRoleSelect');
    const roleReason = document.getElementById('modalRoleReason');
    
    if (!roleSelect.value || !roleReason.value) {
        alert('Please fill in all fields.');
        return;
    }
    
    // Check if user is a tribe member
    const isTribeMember = tribeMembers.some(member => member.name === memberName);
    if (!isTribeMember) {
        alert('Only Trimark Industries tribe members can be assigned roles.');
        return;
    }
    
    // Assign the role (support multiple roles per user)
    if (!userRoles[memberName]) {
        userRoles[memberName] = [];
    }
    
    // Check if user already has this role
    if (userRoles[memberName].includes(roleSelect.value)) {
        alert(`${memberName} already has the role "${roleSelect.value}".`);
        return;
    }
    
    // Prevent assigning crew member role
    if (roleSelect.value === 'crew_member') {
        alert('Crew member role cannot be assigned. Members automatically have this role.');
        return;
    }
    
    // Add the new role
    userRoles[memberName].push(roleSelect.value);
    
    // Save to localStorage
    localStorage.setItem('trimark_user_roles', JSON.stringify(userRoles));
    
    // Log the assignment
    const assignmentLog = {
        id: 'role_' + Date.now(),
        userName: memberName,
        role: roleSelect.value,
        reason: roleReason.value,
        assignedBy: currentAccount || 'Unknown',
        assignedAt: new Date().toLocaleString()
    };
    
    // Save assignment log
    const existingLogs = JSON.parse(localStorage.getItem('trimark_role_assignments') || '[]');
    existingLogs.push(assignmentLog);
    localStorage.setItem('trimark_role_assignments', JSON.stringify(existingLogs));
    
    // Close modal
    closeRoleAssignmentModal();
    
    // Refresh member display
    renderMembersList();
    
    alert(`Role "${roleSelect.value}" assigned to ${memberName} successfully!`);
    console.log('✅ Role assigned:', assignmentLog);
}

// Helper function to migrate old single-role format to new multiple-role format
function migrateRoleFormat() {
    const storedRoles = localStorage.getItem('trimark_user_roles');
    if (storedRoles) {
        const oldRoles = JSON.parse(storedRoles);
        let needsMigration = false;
        
        // Check if any users have single roles (not arrays)
        for (const [userName, roles] of Object.entries(oldRoles)) {
            if (!Array.isArray(roles)) {
                needsMigration = true;
                break;
            }
        }
        
        if (needsMigration) {
            console.log('🔄 Migrating role format from single to multiple...');
            const newRoles = {};
            
            for (const [userName, roles] of Object.entries(oldRoles)) {
                if (Array.isArray(roles)) {
                    newRoles[userName] = [roles];
                } else {
                    // Convert single role to array
                    newRoles[userName] = [roles];
                }
            }
            
            userRoles = newRoles;
            localStorage.setItem('trimark_user_roles', JSON.stringify(newRoles));
            console.log('✅ Role format migration completed');
        }
        
        // Migrate crew_member roles to member roles
        let needsCrewMigration = false;
        for (const [userName, roles] of Object.entries(userRoles)) {
            if (Array.isArray(roles) && roles.includes('crew_member')) {
                needsCrewMigration = true;
                // Replace crew_member with member
                const newRoles = roles.map(role => role === 'crew_member' ? 'member' : role);
                userRoles[userName] = newRoles;
            }
        }
        
        if (needsCrewMigration) {
            localStorage.setItem('trimark_user_roles', JSON.stringify(userRoles));
            console.log('✅ Crew member to member role migration completed');
        }
    }
}

// Role Management Functions
function setupRoleManagement() {
    console.log('Setting up role management...');
    
    // Migrate role format if needed
    migrateRoleFormat();
    
    // Setup role assignment button
    const assignRoleBtn = document.getElementById('assignRoleBtn');
    console.log('🔧 assignRoleBtn found:', !!assignRoleBtn);
    if (assignRoleBtn) {
        assignRoleBtn.addEventListener('click', assignRole);
        console.log('🔧 Event listener added to assignRoleBtn');
    }
    
    // Setup role request button
    const requestRoleBtn = document.getElementById('requestRoleBtn');
    if (requestRoleBtn) {
        requestRoleBtn.addEventListener('click', requestRole);
    }
    
    // Load and display current roles
    loadCurrentRoles();
}

function assignRole() {
    console.log('🔧 assignRole function called');
    
    const userName = document.getElementById('roleUserName').value;
    const roleSelect = document.getElementById('roleSelect');
    const roleReason = document.getElementById('roleReason').value;
    
    console.log('🔧 Form values:', { userName, roleSelect: roleSelect?.value, roleReason });
    
    if (!userName || !roleSelect.value || !roleReason) {
        alert('Please fill in all fields.');
        return;
    }
    
    // TEMPORARY: Allow anyone to assign roles for testing
    // TODO: Restore administrator restriction after testing
    
    // Check if user is a tribe member
    console.log('🔧 Checking tribe membership for:', userName);
    console.log('🔧 Available tribe members:', tribeMembers);
    const isTribeMember = tribeMembers.some(member => member.name === userName);
    console.log('🔧 Is tribe member:', isTribeMember);
    if (!isTribeMember) {
        alert('Only Trimark Industries tribe members can be assigned roles.');
        return;
    }
    
    // Assign the role (support multiple roles per user)
    if (!userRoles[userName]) {
        userRoles[userName] = [];
    }
    
    // Check if user already has this role
    if (userRoles[userName].includes(roleSelect.value)) {
        alert(`${userName} already has the role "${roleSelect.value}".`);
        return;
    }
    
    // Prevent assigning crew member role
    if (roleSelect.value === 'crew_member') {
        alert('Crew member role cannot be assigned. Members automatically have this role.');
        return;
    }
    
    // Add the new role
    userRoles[userName].push(roleSelect.value);
    
    // Save to localStorage
    localStorage.setItem('trimark_user_roles', JSON.stringify(userRoles));
    
    // Log the assignment
    const assignmentLog = {
        id: 'role_' + Date.now(),
        userName: userName,
        role: roleSelect.value,
        reason: roleReason,
        assignedBy: currentAccount || 'Unknown',
        assignedAt: new Date().toLocaleString()
    };
    
    // Save assignment log
    const existingLogs = JSON.parse(localStorage.getItem('trimark_role_assignments') || '[]');
    existingLogs.push(assignmentLog);
    localStorage.setItem('trimark_role_assignments', JSON.stringify(existingLogs));
    
    // Refresh display
    loadCurrentRoles();
    
    // Clear form
    document.getElementById('roleUserName').value = '';
    roleSelect.value = '';
    document.getElementById('roleReason').value = '';
    
    alert(`Role "${roleSelect.value}" assigned to ${userName} successfully!`);
    console.log('✅ Role assigned:', assignmentLog);
}

function requestRole() {
    const roleSelect = document.getElementById('requestRoleSelect');
    const roleReason = document.getElementById('requestRoleReason').value;
    
    if (!roleSelect.value || !roleReason) {
        alert('Please fill in all fields.');
        return;
    }
    
    // Prevent requesting crew member role
    if (roleSelect.value === 'crew_member') {
        alert('Crew member role cannot be requested. Members automatically have this role.');
        return;
    }
    
    // Create role request
    const roleRequest = {
        id: 'request_' + Date.now(),
        userName: currentAccount || 'Unknown',
        requestedRole: roleSelect.value,
        reason: roleReason,
        status: 'pending',
        requestedAt: new Date().toLocaleString()
    };
    
    // Save role request
    const existingRequests = JSON.parse(localStorage.getItem('trimark_role_requests') || '[]');
    existingRequests.push(roleRequest);
    localStorage.setItem('trimark_role_requests', JSON.stringify(existingRequests));
    
    // Clear form
    roleSelect.value = '';
    document.getElementById('requestRoleReason').value = '';
    
    alert('Role request submitted successfully! Administrators will review it.');
    console.log('✅ Role request submitted:', roleRequest);
}

function loadCurrentRoles() {
    const currentRolesList = document.getElementById('currentRolesList');
    if (!currentRolesList) return;
    
    // Load roles from localStorage
    const storedRoles = localStorage.getItem('trimark_user_roles');
    if (storedRoles) {
        userRoles = JSON.parse(storedRoles);
    }
    
    if (Object.keys(userRoles).length === 0) {
        currentRolesList.innerHTML = '<div class="no-roles">No roles assigned yet.</div>';
        return;
    }
    
        const rolesHTML = Object.entries(userRoles).map(([userName, roles]) => {
        // Handle both old single-role format and new multiple-role format
        const userRolesArray = Array.isArray(roles) ? roles : [roles];
        
        return userRolesArray.map(role => {
            const roleDisplayName = getRoleDisplayName(role);
            const roleIcon = getRoleIcon(role);

            return `
                <div class="role-item" data-user="${userName}" data-role="${role}">
                    <div class="role-info">
                        <span class="role-icon">${roleIcon}</span>
                        <span class="role-user">${userName}</span>
                        <span class="role-name">${roleDisplayName}</span>
                    </div>
                    <button onclick="deleteRole('${userName}', '${role}')" class="delete-role-btn">🗑️ Delete</button>
                </div>
            `;
        }).join('');
    }).join('');
    
    currentRolesList.innerHTML = rolesHTML;
}

function deleteRole(userName, roleToDelete) {
    // TEMPORARY: Allow anyone to delete roles for testing
    // TODO: Restore administrator restriction after testing
    
    if (confirm(`Are you sure you want to remove the "${roleToDelete}" role from ${userName}?`)) {
        // Remove the specific role from the user's role array
        if (userRoles[userName] && Array.isArray(userRoles[userName])) {
            const roleIndex = userRoles[userName].indexOf(roleToDelete);
            if (roleIndex > -1) {
                userRoles[userName].splice(roleIndex, 1);
                
                // If user has no more roles, remove the user entry entirely
                if (userRoles[userName].length === 0) {
                    delete userRoles[userName];
                }
                
                // Save to localStorage
                localStorage.setItem('trimark_user_roles', JSON.stringify(userRoles));
                
                // Log the deletion
                const deletionLog = {
                    id: 'del_role_' + Date.now(),
                    userName: userName,
                    deletedRole: roleToDelete,
                    deletedBy: currentAccount || 'Unknown',
                    deletedAt: new Date().toLocaleString()
                };
                
                // Save deletion log
                const existingLogs = JSON.parse(localStorage.getItem('trimark_role_deletions') || '[]');
                existingLogs.push(deletionLog);
                localStorage.setItem('trimark_role_deletions', JSON.stringify(existingLogs));
                
                // Refresh display
                loadCurrentRoles();
                
                alert(`Role "${roleToDelete}" removed from ${userName} successfully!`);
                console.log('✅ Role deleted:', deletionLog);
            } else {
                alert(`User ${userName} does not have the role "${roleToDelete}".`);
            }
        } else {
            alert(`User ${userName} has no roles to delete.`);
        }
    }
}

function getRoleDisplayName(role) {
    const roleNames = {
        'administrator': '👑 Administrator',
        'diplomatic_officer': '🤝 Diplomatic Officer',
        'lead_tactician': '⚔️ Lead Tactician',
        'field_survey_lead': '🔍 Field Survey Lead',
        'recruiter': '📢 Recruiter',
        'ambassador': '🌐 Ambassador',
        'crew_member': '👥 Crew Member',
        'event_coordinator': '📅 Event Coordinator',
        'member': '👥 Crew Member'
    };
    return roleNames[role] || role;
}

function getRoleIcon(role) {
    const roleIcons = {
        'administrator': '👑',
        'diplomatic_officer': '🤝',
        'lead_tactician': '⚔️',
        'field_survey_lead': '🔍',
        'recruiter': '📢',
        'ambassador': '🌐',
        'crew_member': '👥',
        'event_coordinator': '📅',
        'member': '👥'
    };
    return roleIcons[role] || '👥';
}

function checkAdminStatus() {
    // Check if current user has administrator role
    const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
    const userName = userData.name || 'Unknown';

    // Check if user is in userRoles and has administrator role
    const userRolesArray = userRoles[userName];
    if (userRolesArray) {
        // Handle both old single-role format and new multiple-role format
        const roles = Array.isArray(userRolesArray) ? userRolesArray : [userRolesArray];
        if (roles.includes('administrator')) {
            isAdmin = true;
            console.log('✅ User is administrator:', userName);
            // showAdminInterface(); // Removed for testing
        } else {
            isAdmin = false;
            console.log('❌ User is not administrator:', userName);
            // hideAdminInterface(); // Removed for testing
        }
    } else {
        isAdmin = false;
        console.log('❌ User has no roles:', userName);
        // hideAdminInterface(); // Removed for testing
    }
}

// Admin interface functions removed for testing - everyone can see everything

console.log('✅ Clean script.js loaded successfully');
console.log('🔄 Tribe member functionality ready');
console.log('🔗 API Base:', EVE_FRONTIER_API_BASE);
console.log('🏛️ Tribe ID:', REQUIRED_TRIBE_ID);
console.log('🧪 TESTING MODE: Anyone can assign/delete roles');
console.log('📝 No hardcoded administrators - all roles assigned through system');
console.log('🔀 MULTIPLE ROLES: Users can now hold multiple roles simultaneously');
console.log('🎯 ROLE ASSIGNMENT: Moved to members page - click members to assign roles');
console.log('👁️ ROLES DISPLAY: Roles page now shows clickable role boxes with holders');
console.log('🔄 ROLE UPDATES: Member role now displays as "👥 Crew Member", automatically assigned to all players without specific roles');

// ============================================================================
// SECURITY: Session Timeout Protection
// ============================================================================

// Start session timeout protection
function startSessionTimer() {
    console.log('🔒 Starting session timeout protection (30 minutes)');
    
    // Clear any existing timer
    if (window.sessionTimer) {
        clearTimeout(window.sessionTimer);
    }
    
    // Set new timer
    window.sessionTimer = setTimeout(() => {
        console.log('⏰ Session timeout reached, logging out user');
        logoutAndRedirect();
    }, 30 * 60 * 1000); // 30 minutes
    
    // Reset timer on user activity
    document.addEventListener('click', resetSessionTimer);
    document.addEventListener('keypress', resetSessionTimer);
    document.addEventListener('scroll', resetSessionTimer);
    document.addEventListener('mousemove', resetSessionTimer);
}

// Reset session timer on user activity
function resetSessionTimer() {
    if (window.sessionTimer) {
        clearTimeout(window.sessionTimer);
        window.sessionTimer = setTimeout(() => {
            console.log('⏰ Session timeout reached, logging out user');
            logoutAndRedirect();
        }, 30 * 60 * 1000); // 30 minutes
    }
}

// Logout and redirect to landing page
function logoutAndRedirect() {
    console.log('🚪 Security logout: Session timeout or security violation');
    
    // Clear all authentication data
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletAccount');
    localStorage.removeItem('walletType');
    localStorage.removeItem('trimark_user_data');
    
    // Clear session timer
    if (window.sessionTimer) {
        clearTimeout(window.sessionTimer);
        window.sessionTimer = null;
    }
    
    // Remove event listeners
    document.removeEventListener('click', resetSessionTimer);
    document.removeEventListener('keypress', resetSessionTimer);
    document.removeEventListener('scroll', resetSessionTimer);
    document.removeEventListener('mousemove', resetSessionTimer);
    
    // Redirect to landing page
    window.location.href = 'landing.html';
}

console.log('🔒 Session timeout protection initialized');
console.log('⏰ Session timeout set to 30 minutes');
console.log('🔄 Timer resets on user activity');
console.log('🚪 Automatic logout on timeout or security violation');
