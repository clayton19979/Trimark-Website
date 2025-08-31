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

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const userProfile = document.getElementById('userProfile');
const userPortrait = document.getElementById('userPortrait');
const userName = document.getElementById('userName');
const userAddress = document.getElementById('userAddress');
const disconnectWalletBtn = document.getElementById('disconnectWallet');
const navLinks = document.querySelectorAll('.nav-link');

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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Wait a bit for scripts to load
    setTimeout(() => {
        initializeApp();
        setupEventListeners();
        
        // Initially hide main content and footer until user connects and is verified
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.style.display = 'none';
        }
        
        // No initial message needed
        
        checkWalletConnection();
        
        // Check if user is already connected and should see admin panel
        if (currentAccount) {
            loadApprovedUsers();
            checkAdminStatus();
            
            // Check tribe access for existing connection
            const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
            if (!hasRequiredTribeAccess(userData)) {
                showAccessDeniedMessage();
            } else {
                // User has access, ensure content is visible
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.style.display = 'block';
                }
                const footer = document.querySelector('.footer');
                if (footer) {
                    footer.style.display = 'block';
                }
            }
        }
        
                 // Also check admin status for any existing approved users
         if (currentAccount) {
             setTimeout(() => {
                 loadApprovedUsers();
                 checkAdminStatus();
             }, 1000);
         }
         
         // Initialize role management
         initializeRoleManagement();
         
         // Initialize events system
         initializeEvents();
         
         // Welcome screen will show every time wallet is connected
         shouldShowWelcomeScreen = true;
         
         // Setup autocomplete after a delay to ensure DOM is ready
         setTimeout(() => {
             setupRoleAssignmentAutocomplete();
         }, 1000);
    }, 500);
});

// OneKey Wallet Provider
let onekeyProvider = null;

// Initialize OneKey wallet detection
function initializeOneKeyWallet() {
    console.log('🔍 Initializing OneKey wallet detection...');
    
    const onAnnounceProvider = (event) => {
        // The event.detail contains the provider info and the provider object itself.
        // event.detail = { info: { uuid, name, icon, rdns }, provider }
        if (event.detail.info.name === 'OneKey') {
            onekeyProvider = event.detail.provider;
            console.log('✅ OneKey wallet detected!');
            walletType = 'onekey';
            
            // Check if already connected
            checkExistingOneKeyConnection();
        }
        // You can also store all providers in an array to let users choose.
    };

    // Listen for the announcement event from all wallets
    window.addEventListener('eip6963:announceProvider', onAnnounceProvider);

    // It's also good practice to dispatch a request event to prompt wallets
    // that may have loaded after the initial page load.
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // After a short delay, check if the onekeyProvider was found.
    setTimeout(() => {
        if (onekeyProvider) {
            console.log('✅ OneKey wallet ready!');
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Connect OneKey Wallet';
                connectWalletBtn.disabled = false;
            }
        } else {
            console.log('❌ OneKey Wallet not found. Please install it from onekey.so/download');
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Install OneKey Wallet';
                connectWalletBtn.disabled = false;
            }
        }
    }, 500);
}

// Check if OneKey wallet is already connected
async function checkExistingOneKeyConnection() {
    if (!onekeyProvider) return;
    
    try {
        const accounts = await onekeyProvider.request({ 
            method: 'eth_accounts' 
        });
        
        if (accounts.length > 0) {
            console.log('✅ Found existing OneKey wallet connection:', accounts[0]);
            currentAccount = accounts[0];
            isConnected = true;
            
            // Create ethers provider and signer
            provider = new ethers.providers.Web3Provider(onekeyProvider);
            signer = provider.getSigner();
            
            // Get network info
            const network = await provider.getNetwork();
            chainId = network.chainId;
            
            // Update UI
            await updateUserProfile();
            
            // Load approved users first, then check admin status
            loadApprovedUsers();
            checkAdminStatus();
            
            setupOneKeyWalletListeners();
        }
    } catch (error) {
        console.error('Error checking existing OneKey connection:', error);
    }
}

// Initialize the application
function initializeApp() {
    console.log('Initializing app with wallet detection...');
    
    // Check if ethers is available
    if (typeof ethers === 'undefined') {
        console.log('❌ Ethers library not loaded, retrying...');
        setTimeout(initializeApp, 1000);
        return;
    }
    
    console.log('✅ Ethers library loaded successfully');
    
    // Initialize admin system
    loadApprovedUsers();
    
    // Initialize OneKey wallet detection
    initializeOneKeyWallet();
    
    // Also check for MetaMask as fallback
    if (typeof window.ethereum !== 'undefined') {
        console.log('✅ MetaMask detected as fallback!');
        walletType = 'metamask';
        
        // Check if already connected
        checkExistingConnection();
    } else {
        console.log('❌ No MetaMask detected');
        walletType = 'none';
        
        if (connectWalletBtn) {
            connectWalletBtn.textContent = 'Install OneKey Wallet';
            connectWalletBtn.disabled = false;
        }
    }
}

// Check if MetaMask wallet is already connected
async function checkExistingConnection() {
    try {
        if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                console.log('✅ Found existing MetaMask wallet connection:', accounts[0]);
                currentAccount = accounts[0];
                isConnected = true;
                walletType = 'metamask';
                
                // Create provider and signer
                provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = provider.getSigner();
                
                // Get network info
                const network = await provider.getNetwork();
                chainId = network.chainId;
                
                // Update UI
                await updateUserProfile();
                
                // Load approved users first, then check admin status
                loadApprovedUsers();
                checkAdminStatus();
                
                setupWalletListeners();
            }
        }
    } catch (error) {
        console.error('Error checking existing MetaMask connection:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Wallet connection
    if (connectWalletBtn) {
        console.log('Adding click listener to connect wallet button');
        connectWalletBtn.addEventListener('click', connectWallet);
    } else {
        console.error('Connect wallet button not found!');
    }
    
    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', disconnectWallet);
    } else {
        console.error('Disconnect wallet button not found!');
    }
    

    
    // Admin panel modal controls
    const closeAdminModal = document.getElementById('closeAdminModal');
    if (closeAdminModal) {
        closeAdminModal.addEventListener('click', closeAdminPanel);
    }
    
    // Admin panel form controls
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', openAddUserModal);
    }
    
    // Add user modal controls
    const closeAddUserModalBtn = document.getElementById('closeAddUserModal');
    if (closeAddUserModalBtn) {
        closeAddUserModalBtn.addEventListener('click', closeAddUserModal);
    }
    
    const confirmAddUserBtn = document.getElementById('confirmAddUserBtn');
    if (confirmAddUserBtn) {
        confirmAddUserBtn.addEventListener('click', () => {
            const input = document.getElementById('newUserAddress');
            if (input) {
                addApprovedUser(input.value);
                closeAddUserModal();
            }
        });
    }
    
    // Admin modal controls
    const addAdminBtn = document.getElementById('addAdminBtn');
    if (addAdminBtn) {
        addAdminBtn.addEventListener('click', openAddAdminModal);
    }
    
    const closeAddAdminModalBtn = document.getElementById('closeAddAdminModal');
    if (closeAddAdminModalBtn) {
        closeAddAdminModalBtn.addEventListener('click', closeAddAdminModal);
    }
    
    const confirmAddAdminBtn = document.getElementById('confirmAddAdminBtn');
    if (confirmAddAdminBtn) {
        confirmAddAdminBtn.addEventListener('click', () => {
            const input = document.getElementById('newAdminAddress');
            if (input) {
                addAdminUser(input.value);
                closeAddAdminModal();
            }
        });
    }
    
         // Edit content button
     const editContentBtn = document.getElementById('editContentBtn');
     if (editContentBtn) {
         editContentBtn.addEventListener('click', toggleContentEditing);
     }
     
           // Role assignment button
      const assignRoleBtn = document.getElementById('assignRoleBtn');
      if (assignRoleBtn) {
          assignRoleBtn.addEventListener('click', () => {
              const characterName = document.getElementById('roleUserName').value;
              const role = document.getElementById('roleSelect').value;
              const reason = document.getElementById('roleReason').value;
              
              if (!characterName || !role) {
                  alert('Please provide both character name and role');
                  return;
              }
              
              assignRoleToUser(characterName, role, reason);
          });
      }
     
     // Role request button
     const requestRoleBtn = document.getElementById('requestRoleBtn');
     if (requestRoleBtn) {
         requestRoleBtn.addEventListener('click', () => {
             const role = document.getElementById('requestRoleSelect').value;
             const reason = document.getElementById('requestRoleReason').value;
             
             if (!role || !reason) {
                 alert('Please provide both role and reason');
                 return;
             }
             
             requestRole(role, reason);
             
             // Clear form
             document.getElementById('requestRoleSelect').value = '';
             document.getElementById('requestRoleReason').value = '';
         });
     }
     
     // Events management event listeners
     const createEventBtn = document.getElementById('createEventBtn');
     if (createEventBtn) {
         createEventBtn.addEventListener('click', function() {
             const title = document.getElementById('eventTitle').value;
             const description = document.getElementById('eventDescription').value;
             const date = document.getElementById('eventDate').value;
             const time = document.getElementById('eventTime').value;
             const location = document.getElementById('eventLocation').value;
             
             if (!title || !description || !date || !time || !location) {
                 alert('Please fill in all event fields');
                 return;
             }
             
             // Get user's character name for organizer
             const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
             const organizer = userData.name || 'Unknown';
             
             createEvent(title, description, date, time, location, organizer);
             
             // Clear form
             document.getElementById('eventTitle').value = '';
             document.getElementById('eventDescription').value = '';
             document.getElementById('eventDate').value = '';
             document.getElementById('eventTime').value = '';
             document.getElementById('eventLocation').value = '';
         });
     }
    
    // User search functionality
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', filterUsers);
    }
    
    // Close admin panel when clicking outside
    const adminModal = document.getElementById('adminPanelModal');
    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) {
                closeAdminPanel();
            }
        });
    }
    

    
    // Navigation
    if (navLinks && navLinks.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', handleNavigation);
        });
    }
    

    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    console.log('Event listeners setup complete');
}

// Handle navigation
function handleNavigation(e) {
    navLinks.forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');
    
    // Setup autocomplete when roles section is accessed
    if (e.target.getAttribute('href') === '#roles') {
        setTimeout(() => {
            setupRoleAssignmentAutocomplete();
        }, 500);
    }
}

// Connect wallet function using OneKey or MetaMask
async function connectWallet() {
    console.log('🔌 Connect wallet function called!');
    
    try {
        // Update button to show loading state
        connectWalletBtn.textContent = 'Connecting...';
        connectWalletBtn.disabled = true;
        isConnecting = true;
        error = null;

        console.log('🔌 Attempting wallet connection...');

        // Check if ethers is available
        if (typeof ethers === 'undefined') {
            throw new Error('Ethers library not loaded. Please refresh the page and try again.');
        }

        let accounts = [];
        let selectedProvider = null;

        // Try OneKey wallet first
        if (onekeyProvider) {
            console.log('🔌 OneKey wallet detected, requesting accounts...');
            try {
                accounts = await onekeyProvider.request({ 
                    method: 'eth_requestAccounts' 
                });
                selectedProvider = onekeyProvider;
                walletType = 'onekey';
                console.log('✅ OneKey accounts received:', accounts);
            } catch (err) {
                console.log('❌ OneKey connection failed, trying MetaMask...');
            }
        }

        // Fallback to MetaMask if OneKey failed or not available
        if (!selectedProvider && typeof window.ethereum !== 'undefined') {
            console.log('🔌 MetaMask detected, requesting accounts...');
            try {
                accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                selectedProvider = window.ethereum;
                walletType = 'metamask';
                console.log('✅ MetaMask accounts received:', accounts);
            } catch (err) {
                console.log('❌ MetaMask connection failed');
            }
        }

        if (!selectedProvider) {
            throw new Error('No wallet provider available. Please install OneKey Wallet or MetaMask!');
        }

        if (accounts.length === 0) {
            throw new Error('No accounts found!');
        }

        // Create ethers provider and signer
        provider = new ethers.providers.Web3Provider(selectedProvider);
        signer = provider.getSigner();
        
        // Get network info
        const network = await provider.getNetwork();
        chainId = network.chainId;

        // Set state
        currentAccount = accounts[0];
        isConnected = true;

        console.log('✅ Wallet connected successfully:', currentAccount);
        console.log('🔗 Network chain ID:', chainId);
        console.log('🔗 Wallet type:', walletType);

        // Update UI
        await updateUserProfile();
        
        // Load approved users first, then check admin status
        loadApprovedUsers();
        checkAdminStatus();
        
        // Set up wallet event listeners based on wallet type
        if (walletType === 'onekey') {
            setupOneKeyWalletListeners();
        } else {
            setupWalletListeners();
        }

        // Show success message
        alert(`${walletType === 'onekey' ? 'OneKey' : 'MetaMask'} wallet connected successfully! Account: ` + currentAccount.slice(0, 6) + '...' + currentAccount.slice(-4));

    } catch (err) {
        error = err.message;
        console.error('❌ Error connecting wallet:', err);
        alert('Failed to connect wallet: ' + err.message);
    } finally {
        isConnecting = false;
        if (walletType === 'onekey') {
            connectWalletBtn.textContent = 'Connect OneKey Wallet';
        } else {
            connectWalletBtn.textContent = 'Connect Wallet';
        }
        connectWalletBtn.disabled = false;
    }
}

// Set up OneKey wallet event listeners
function setupOneKeyWalletListeners() {
    if (onekeyProvider) {
        // Listen for account changes
        onekeyProvider.on('accountsChanged', (accounts) => {
            console.log('🔌 OneKey accounts changed:', accounts);
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                currentAccount = accounts[0];
                updateUserProfile();
                // Check admin status for new account
                loadApprovedUsers();
                checkAdminStatus();
                
                // Check tribe access for new account
                const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
                if (!hasRequiredTribeAccess(userData)) {
                    showAccessDeniedMessage();
                } else {
                    // User has access, ensure content is visible
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        mainContent.style.display = 'block';
                    }
                    const footer = document.querySelector('.footer');
                    if (footer) {
                        footer.style.display = 'block';
                    }
                }
            }
        });

        // Listen for chain changes
        onekeyProvider.on('chainChanged', (newChainId) => {
            console.log('🔗 OneKey chain changed:', newChainId);
            chainId = parseInt(newChainId, 16);
            window.location.reload(); // Reload to ensure clean state
        });

        // Listen for disconnect
        onekeyProvider.on('disconnect', () => {
            console.log('🔌 OneKey wallet disconnected');
            disconnectWallet();
        });
    }
}

// Set up MetaMask wallet event listeners
function setupWalletListeners() {
    if (typeof window.ethereum !== 'undefined') {
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log('🔌 MetaMask accounts changed:', accounts);
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                currentAccount = accounts[0];
                updateUserProfile();
                // Check admin status for new account
                loadApprovedUsers();
                checkAdminStatus();
                
                // Check tribe access for new account
                const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
                if (!hasRequiredTribeAccess(userData)) {
                    showAccessDeniedMessage();
                } else {
                    // User has access, ensure content is visible
                    const mainContent = document.querySelector('.main-content');
                    if (mainContent) {
                        mainContent.style.display = 'block';
                    }
                    const footer = document.querySelector('.footer');
                    if (footer) {
                        footer.style.display = 'block';
                    }
                }
            }
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', (newChainId) => {
            console.log('🔗 MetaMask chain changed:', newChainId);
            chainId = parseInt(newChainId, 16);
            window.location.reload(); // Reload to ensure clean state
        });

        // Listen for disconnect
        window.ethereum.on('disconnect', () => {
            console.log('🔌 MetaMask wallet disconnected');
            disconnectWallet();
        });
    }
}



// Handle account changes for MetaMask
async function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // Wallet is locked or the user has no accounts
        disconnectWallet();
    } else if (accounts[0] !== currentAccount) {
        currentAccount = accounts[0];
        await updateUserProfile();
        // Check admin status for new account
        loadApprovedUsers();
        checkAdminStatus();
        
        // Check tribe access for new account
        const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
        if (!hasRequiredTribeAccess(userData)) {
            showAccessDeniedMessage();
        } else {
            // User has access, ensure content is visible
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.display = 'block';
            }
            const footer = document.querySelector('.footer');
            if (footer) {
                footer.style.display = 'block';
            }
        }
    }
}

// Update user profile with EVE Frontier data
async function updateUserProfile() {
    try {
        // Show loading state
        userProfile.classList.remove('hidden');
        connectWalletBtn.style.display = 'none';
        
        // Fetch user data from EVE Frontier API
        const userData = await fetchEveFrontierData(currentAccount);
        
        if (userData) {
            // Check if user has required tribe access
            if (!hasRequiredTribeAccess(userData)) {
                // User doesn't have required tribe access
                userProfile.classList.add('hidden');
                connectWalletBtn.style.display = 'flex';
                connectWalletBtn.textContent = 'Access Denied - Wrong Tribe';
                connectWalletBtn.disabled = true;
                
                // Show access denied message
                showAccessDeniedMessage();
                return;
            }
            
            // User has access - update UI with user data
            userPortrait.src = userData.portraitUrl || 'https://artifacts.evefrontier.com/portraits/PortraitAwakened256.png';
            userName.textContent = userData.name || 'Unknown Character';
            
            // Get user's role and display it instead of wallet address
            const userRoleEntry = Object.entries(userRoles).find(([characterName, roleData]) => 
                roleData.memberAddress && roleData.memberAddress.toLowerCase() === currentAccount.toLowerCase()
            );
            const userRole = userRoleEntry ? userRoleEntry[1].role : null;
            const roleDisplay = userRole ? ROLE_TYPES[userRole].name : 'No Role Assigned';
            userAddress.textContent = roleDisplay;
            
            // Store user data for later use
            localStorage.setItem('trimark_user_data', JSON.stringify(userData));
            
            // Restore main content visibility for users with access
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.display = 'block';
            }
            
            // Restore footer visibility for users with access
            const footer = document.querySelector('.footer');
            if (footer) {
                footer.style.display = 'block';
            }
            
            // Remove access denied message if it exists
            const accessDeniedMessage = document.getElementById('accessDeniedMessage');
            if (accessDeniedMessage) {
                accessDeniedMessage.remove();
            }
            
            // Show welcome screen for new users (only once per session)
            if (shouldShowWelcomeScreen && !sessionStorage.getItem('trimark_welcome_shown')) {
                // Get user's role
                const userRoleEntry = Object.entries(userRoles).find(([characterName, roleData]) => 
                    roleData.memberAddress && roleData.memberAddress.toLowerCase() === currentAccount.toLowerCase()
                );
                const userRole = userRoleEntry ? ROLE_TYPES[userRoleEntry[1].role] : null;
                
                showWelcomeScreen(userData.name, userData.portraitUrl || 'https://artifacts.evefrontier.com/portraits/PortraitAwakened256.png', userRole);
                sessionStorage.setItem('trimark_welcome_shown', 'true');
            }
            
            // Add success animation
            userProfile.style.animation = 'fadeIn 0.5s ease-in';
        } else {
            // No user data - show error
            userProfile.classList.add('hidden');
            connectWalletBtn.style.display = 'flex';
            connectWalletBtn.textContent = 'Access Denied - No Data';
            connectWalletBtn.disabled = true;
            showAccessDeniedMessage();
        }
        
    } catch (error) {
        console.error('Error updating user profile:', error);
        // Error occurred - show error state
        userProfile.classList.add('hidden');
        connectWalletBtn.style.display = 'flex';
        connectWalletBtn.textContent = 'Access Denied - Error';
        connectWalletBtn.disabled = true;
        showAccessDeniedMessage();
    }
}

// Check if user has required tribe ID
function hasRequiredTribeAccess(userData) {
    if (!userData || !userData.tribeId) {
        console.log('❌ No tribe ID found in user data');
        return false;
    }
    
    const hasAccess = userData.tribeId === REQUIRED_TRIBE_ID;
    console.log(`🔍 Tribe ID check: ${userData.tribeId} === ${REQUIRED_TRIBE_ID} = ${hasAccess}`);
    return hasAccess;
}



// Show access denied message
function showAccessDeniedMessage() {
    // Remove any existing access denied message
    const existingMessage = document.getElementById('accessDeniedMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Hide all main content sections
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    
    // Hide footer
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.style.display = 'none';
    }
    
    // Create access denied message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'accessDeniedMessage';
    messageDiv.className = 'access-denied-message';
    messageDiv.innerHTML = `
        <div class="access-denied-content">
            <h3>🚫 Access Denied</h3>
            <p>This site is restricted to members of <strong>Trimark Industries</strong></p>
            <p>Your character must be a member of this tribe to access Trimark Industries.</p>
            <div class="discord-help-section">
                <p>💬 Need help joining the tribe?</p>
                <a href="https://discord.gg/7ym36qS9" target="_blank" class="discord-invite-btn">
                    <span class="discord-icon">📱</span>
                    Join Our Discord
                </a>
                <p class="discord-help-text">Join our Discord server to get help getting approved in-game!</p>
                <p class="discord-note">Once you're part of the tribe in-game, reconnect your wallet to access the site.</p>
            </div>
            <button onclick="disconnectWallet()" class="access-denied-btn">Disconnect Wallet</button>
        </div>
    `;
    
    // Insert message after the header
    const header = document.querySelector('.header');
    if (header) {
        header.parentNode.insertBefore(messageDiv, header.nextSibling);
    }
}

// Fetch EVE Frontier data
async function fetchEveFrontierData(address) {
    try {
        const response = await fetch(`${EVE_FRONTIER_API_BASE}/smartcharacters/${address}?format=json`, {
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
        console.log('EVE Frontier data:', data);
        return data;
        
    } catch (error) {
        console.error('Error fetching EVE Frontier data:', error);
        return null;
    }
}

// Disconnect wallet
function disconnectWallet() {
    // Reset state
    currentAccount = null;
    provider = null;
    signer = null;
    isConnected = false;
    chainId = null;
    error = null;
    isAdmin = false;
    
    // Reset UI
    userProfile.classList.add('hidden');
    connectWalletBtn.style.display = 'flex';
    
    // Clear stored data
    localStorage.removeItem('trimark_user_data');
    
    // Reset UI elements
    userPortrait.src = '';
    userName.textContent = '';
    userAddress.textContent = 'No Role Assigned';
    
    // Re-enable and reset button
    connectWalletBtn.disabled = false;
    if (walletType === 'onekey') {
        connectWalletBtn.textContent = 'Connect OneKey Wallet';
    } else {
        connectWalletBtn.textContent = 'Connect Wallet';
    }
    

    
    // Remove access denied message if it exists
    const accessDeniedMessage = document.getElementById('accessDeniedMessage');
    if (accessDeniedMessage) {
        accessDeniedMessage.remove();
    }
    
    // Restore main content visibility
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Restore footer visibility
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.style.display = 'block';
    }
    
    console.log('🔌 Wallet disconnected successfully');
}

// Check if wallet is already connected
async function checkWalletConnection() {
    // This is now handled in checkExistingConnection()
    console.log('🔍 Checking wallet connection...');
}





// WalletConnect event listeners are now handled in setupWalletConnectListeners()

// Add some interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add parallax effect to hero section
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.hero-section');
        if (parallax) {
            const speed = scrolled * 0.5;
            parallax.style.transform = `translateY(${speed}px)`;
        }
    });
    
    // Add typing effect to hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        // Start typing effect after a delay
        setTimeout(typeWriter, 1000);
    }
    
    // Add hover effects to service items
    const serviceItems = document.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add page visibility change listener to refresh admin status
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && currentAccount) {
            loadApprovedUsers();
            checkAdminStatus();
        }
    });
    
    // Also check admin status periodically for approved users
    setInterval(() => {
        if (currentAccount) {
            loadApprovedUsers();
            checkAdminStatus();
        }
    }, 5000); // Check every 5 seconds
    
    // Add scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.about-card, .service-item, .contact-form');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Utility function to format EVE balance
function formatEveBalance(balanceInWei) {
    const balance = ethers.utils.formatEther(balanceInWei);
    return parseFloat(balance).toFixed(2);
}

// Utility function to format gas balance
function formatGasBalance(balanceInWei) {
    const balance = ethers.utils.formatEther(balanceInWei);
    return parseFloat(balance).toFixed(2);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideInFromLeft {
        from { opacity: 0; transform: translateX(-50px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideInFromRight {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    .fade-in {
        animation: fadeIn 0.6s ease-out;
    }
    
    .slide-in-left {
        animation: slideInFromLeft 0.6s ease-out;
    }
    
    .slide-in-right {
        animation: slideInFromRight 0.6s ease-out;
    }
`;
document.head.appendChild(style);

// Admin Panel Functions
function checkAdminStatus() {
    // Check if user is admin or approved first (these users should always see admin panel)
    if (currentAccount && (ADMIN_WALLETS.includes(currentAccount.toLowerCase()) || approvedUsers.includes(currentAccount.toLowerCase()))) {
        isAdmin = true;
        console.log('✅ User is admin or approved');
        return;
    }
    
    // For non-admin users, check tribe access
    const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
    if (!hasRequiredTribeAccess(userData)) {
        isAdmin = false;
        console.log('❌ User does not have tribe access');
        return;
    }
    
    // User has tribe access but is not admin/approved
    isAdmin = false;
    console.log('❌ User has tribe access but is not admin or approved');
}



function openAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        loadAdminData();
    }
}

function closeAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

function loadAdminData() {
    loadApprovedUsers();
    renderUsersList();
    updateAdminStats();
    loadRecentActivity();
}

function loadApprovedUsers() {
    // Load admin wallets from localStorage
    const storedAdminWallets = localStorage.getItem('trimark_admin_wallets');
    if (storedAdminWallets) {
        ADMIN_WALLETS.length = 0; // Clear array
        ADMIN_WALLETS.push(...JSON.parse(storedAdminWallets));
    }
    
    const storedUsers = localStorage.getItem('trimark_approved_users');
    if (storedUsers) {
        approvedUsers = JSON.parse(storedUsers);
    } else {
        // Initialize with default approved users if none exist
        approvedUsers = [...ADMIN_WALLETS];
        localStorage.setItem('trimark_approved_users', JSON.stringify(approvedUsers));
    }
}

function updateAdminStats() {
    const totalUsersEl = document.getElementById('totalUsers');
    const activeUsersEl = document.getElementById('activeUsers');
    
    if (totalUsersEl) totalUsersEl.textContent = approvedUsers.length;
    if (activeUsersEl) activeUsersEl.textContent = approvedUsers.length;
}

function loadRecentActivity() {
    const activityLog = document.getElementById('recentActivity');
    if (!activityLog) return;
    
    const storedActivity = localStorage.getItem('trimark_admin_activity');
    let activities = [];
    
    if (storedActivity) {
        activities = JSON.parse(storedActivity);
    }
    
    if (activities.length === 0) {
        activityLog.innerHTML = '<p class="no-activity">No recent activity</p>';
        return;
    }
    
    const recentActivities = activities.slice(-5).reverse(); // Show last 5 activities
    activityLog.innerHTML = recentActivities.map(activity => 
        `<div class="activity-item">
            <strong>${activity.action}</strong>: ${activity.address} - ${new Date(activity.timestamp).toLocaleString()}
        </div>`
    ).join('');
}

function addApprovedUser(address) {
    if (!address || address.trim() === '') {
        alert('Please enter a valid wallet address');
        return;
    }
    
    const cleanAddress = address.trim().toLowerCase();
    
    if (approvedUsers.includes(cleanAddress)) {
        alert('User is already approved');
        return;
    }
    
    // Note: Users can only be added to approved list if they have tribe access
    // This will be checked when they connect their wallet
    approvedUsers.push(cleanAddress);
    localStorage.setItem('trimark_approved_users', JSON.stringify(approvedUsers));
    
    // Log activity
    logAdminActivity('User Approved', cleanAddress);
    
    // Update UI
    updateAdminStats();
    renderUsersList();
    loadRecentActivity();
    
    // Check if the current user is the one being added, and update their admin status
    if (currentAccount && currentAccount.toLowerCase() === cleanAddress) {
        checkAdminStatus();
    }
    
    alert('User approved successfully! Note: Users must have tribe access to use the admin panel.');
}

function addAdminUser(address) {
    if (!isAdmin) {
        alert('Only admins can add other admins');
        return;
    }
    
    if (!address || address.trim() === '') {
        alert('Please enter a valid wallet address');
        return;
    }
    
    const cleanAddress = address.trim().toLowerCase();
    
    // Check if user is already an admin
    if (ADMIN_WALLETS.includes(cleanAddress)) {
        alert('User is already an admin');
        return;
    }
    
    // Check if user is already approved
    if (approvedUsers.includes(cleanAddress)) {
        alert('User is already approved. Use "Promote to Admin" instead.');
        return;
    }
    
    // Add to admin wallets array
    ADMIN_WALLETS.push(cleanAddress);
    
    // Also add to approved users if not already there
    if (!approvedUsers.includes(cleanAddress)) {
        approvedUsers.push(cleanAddress);
    }
    
    // Save to localStorage
    localStorage.setItem('trimark_admin_wallets', JSON.stringify(ADMIN_WALLETS));
    localStorage.setItem('trimark_approved_users', JSON.stringify(approvedUsers));
    
    // Log activity
    logAdminActivity('Admin Added', cleanAddress);
    
    // Update UI
    updateAdminStats();
    renderUsersList();
    loadRecentActivity();
    
    alert('Admin user added successfully!');
}

function promoteToAdmin(address) {
    if (!isAdmin) {
        alert('Only admins can promote users to admin');
        return;
    }
    
    if (!address || address.trim() === '') {
        alert('Please enter a valid wallet address');
        return;
    }
    
    const cleanAddress = address.trim().toLowerCase();
    
    // Check if user is already an admin
    if (ADMIN_WALLETS.includes(cleanAddress)) {
        alert('User is already an admin');
        return;
    }
    
    // Check if user is in approved users list
    if (!approvedUsers.includes(cleanAddress)) {
        alert('User must be approved first before promoting to admin');
        return;
    }
    
    // Add to admin wallets array
    ADMIN_WALLETS.push(cleanAddress);
    
    // Save to localStorage
    localStorage.setItem('trimark_admin_wallets', JSON.stringify(ADMIN_WALLETS));
    
    // Log activity
    logAdminActivity('User Promoted to Admin', cleanAddress);
    
    // Update UI
    updateAdminStats();
    renderUsersList();
    loadRecentActivity();
    
    alert('User promoted to admin successfully!');
}

function demoteFromAdmin(address) {
    if (!isAdmin) {
        alert('Only admins can demote other admins');
        return;
    }
    
    if (!address || address.trim() === '') {
        alert('Please enter a valid wallet address');
        return;
    }
    
    const cleanAddress = address.trim().toLowerCase();
    
    // Check if user is actually an admin
    if (!ADMIN_WALLETS.includes(cleanAddress)) {
        alert('User is not an admin');
        return;
    }
    
    // Prevent demoting yourself
    if (currentAccount && currentAccount.toLowerCase() === cleanAddress) {
        alert('You cannot demote yourself from admin');
        return;
    }
    
    // Remove from admin wallets array
    const adminIndex = ADMIN_WALLETS.indexOf(cleanAddress);
    if (adminIndex > -1) {
        ADMIN_WALLETS.splice(adminIndex, 1);
    }
    
    // Save to localStorage
    localStorage.setItem('trimark_admin_wallets', JSON.stringify(ADMIN_WALLETS));
    
    // Log activity
    logAdminActivity('Admin Demoted', cleanAddress);
    
    // Update UI
    updateAdminStats();
    renderUsersList();
    loadRecentActivity();
    
    alert('Admin demoted successfully! User remains in approved users list.');
}

function removeApprovedUser(address) {
    if (!address || address.trim() === '') {
        alert('Please enter a valid wallet address');
        return;
    }
    
    const cleanAddress = address.trim().toLowerCase();
    
    if (!approvedUsers.includes(cleanAddress)) {
        alert('User is not in the approved list');
        return;
    }
    
    if (ADMIN_WALLETS.includes(cleanAddress)) {
        alert('Cannot remove admin users');
        return;
    }
    
    approvedUsers = approvedUsers.filter(user => user !== cleanAddress);
    localStorage.setItem('trimark_approved_users', JSON.stringify(approvedUsers));
    
    // Log activity
    logAdminActivity('User Revoked', cleanAddress);
    
    // Update UI
    updateAdminStats();
    renderUsersList();
    loadRecentActivity();
    
    alert('User access revoked successfully!');
}

function logAdminActivity(action, address) {
    const storedActivity = localStorage.getItem('trimark_admin_activity');
    let activities = [];
    
    if (storedActivity) {
        activities = JSON.parse(storedActivity);
    }
    
    activities.push({
        action: action,
        address: address,
        timestamp: Date.now(),
        admin: currentAccount
    });
    
    // Keep only last 50 activities
    if (activities.length > 50) {
        activities = activities.slice(-50);
    }
    
    localStorage.setItem('trimark_admin_activity', JSON.stringify(activities));
}

function isUserApproved(address) {
    if (!address) return false;
    return approvedUsers.includes(address.toLowerCase());
}

// User list management functions
function renderUsersList(users = null) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    const usersToRender = users || approvedUsers;
    
    if (usersToRender.length === 0) {
        usersList.innerHTML = '<p class="no-users">No users found</p>';
        return;
    }
    
    usersList.innerHTML = usersToRender.map(user => {
        const isAdminUser = ADMIN_WALLETS.includes(user.toLowerCase());
        const statusClass = isAdminUser ? 'admin' : 'approved';
        const statusText = isAdminUser ? 'Admin' : 'Approved';
        const isCurrentUser = currentAccount && currentAccount.toLowerCase() === user.toLowerCase();
        
        return `
            <div class="user-item" data-address="${user}">
                <div class="user-info">
                    <div class="user-address">${user}</div>
                    <span class="user-status ${statusClass}">${statusText}</span>
                </div>
                <div class="user-actions">
                    ${!isAdminUser ? `
                        <button class="user-action-btn promote" onclick="promoteToAdmin('${user}')" title="Promote to Admin">
                            👑 Promote
                        </button>
                        <button class="user-action-btn remove" onclick="removeApprovedUser('${user}')" title="Remove User">
                            ❌ Remove
                        </button>
                    ` : isAdminUser && !isCurrentUser ? `
                        <button class="user-action-btn demote" onclick="demoteFromAdmin('${user}')" title="Demote from Admin">
                            👎 Demote
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function filterUsers() {
    const searchInput = document.getElementById('userSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderUsersList();
        return;
    }
    
    const filteredUsers = approvedUsers.filter(user => 
        user.toLowerCase().includes(searchTerm)
    );
    
    renderUsersList(filteredUsers);
}

function openAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        
        // Clear input
        const input = document.getElementById('newUserAddress');
        if (input) input.value = '';
    }
}

function openAddAdminModal() {
    if (!isAdmin) {
        alert('Only admins can add other admins');
        return;
    }
    
    const modal = document.getElementById('addAdminModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('show');
        
        // Clear input
        const input = document.getElementById('newAdminAddress');
        if (input) input.value = '';
    }
}

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

function closeAddAdminModal() {
    const modal = document.getElementById('addAdminModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

// Content Editing Functions
let isContentEditingEnabled = false;

function toggleContentEditing() {
    if (!isAdmin) {
        alert('Only admins can edit content');
        return;
    }
    
    if (isContentEditingEnabled) {
        disableContentEditing();
        const editBtn = document.getElementById('editContentBtn');
        if (editBtn) {
            editBtn.textContent = '✏️ Edit Content';
            editBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ff4757)';
        }
    } else {
        enableContentEditing();
        const editBtn = document.getElementById('editContentBtn');
        if (editBtn) {
            editBtn.textContent = '❌ Stop Editing';
            editBtn.style.background = 'linear-gradient(135deg, #ff4444, #cc3333)';
        }
    }
}

function enableContentEditing() {
    if (!isAdmin) return;
    
    isContentEditingEnabled = true;
    
    // Add edit buttons to all editable content
    addEditButtons();
    
    // Make content editable
    makeContentEditable();
    
    console.log('✅ Content editing enabled for admin');
}

function disableContentEditing() {
    // Remove edit buttons
    removeEditButtons();
    
    // Make content non-editable
    makeContentNonEditable();
    
    console.log('❌ Content editing disabled');
}

function addEditButtons() {
    // Remove existing edit buttons first
    removeEditButtons();
    
    // Add edit buttons to main content sections
    const editableSections = document.querySelectorAll('.hero-title, .hero-description, .about-card h3, .about-card p, .service-item h3, .service-item p, .contact-info h3, .contact-info p, .contact-form h3, .contact-form p');
    
    editableSections.forEach(section => {
        if (!section.querySelector('.edit-btn')) {
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '✏️';
            editBtn.title = 'Edit Content';
            editBtn.onclick = () => editContent(section);
            
            // Position the edit button
            section.style.position = 'relative';
            section.appendChild(editBtn);
        }
    });
}

function removeEditButtons() {
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => btn.remove());
}

function makeContentEditable() {
    const editableSections = document.querySelectorAll('.hero-title, .hero-description, .about-card h3, .about-card p, .service-item h3, .service-item p, .contact-info h3, .contact-info p, .contact-form h3, .contact-form p');
    
    editableSections.forEach(section => {
        section.contentEditable = true;
        section.classList.add('editable-content');
    });
}

function makeContentNonEditable() {
    const editableSections = document.querySelectorAll('.editable-content');
    
    editableSections.forEach(section => {
        section.contentEditable = false;
        section.classList.remove('editable-content');
    });
}

function editContent(element) {
    if (!isAdmin) return;
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
        <div class="edit-modal-content">
            <h3>Edit Content</h3>
            <textarea class="edit-textarea">${element.textContent}</textarea>
            <div class="edit-modal-buttons">
                <button class="save-edit-btn">Save</button>
                <button class="cancel-edit-btn">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Focus on textarea
    const textarea = modal.querySelector('.edit-textarea');
    textarea.focus();
    textarea.select();
    
    // Event listeners
    const saveBtn = modal.querySelector('.save-edit-btn');
    const cancelBtn = modal.querySelector('.cancel-edit-btn');
    
    saveBtn.onclick = () => {
        const newContent = textarea.value.trim();
        if (newContent) {
            element.textContent = newContent;
            saveContentToStorage(element.className, newContent);
            logAdminActivity('Content Edited', `${element.className}: ${newContent.substring(0, 50)}...`);
        }
        closeEditModal(modal);
    };
    
    cancelBtn.onclick = () => closeEditModal(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) closeEditModal(modal);
    };
    
    // Close on Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeEditModal(modal);
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

function closeEditModal(modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
}

function saveContentToStorage(className, content) {
    const storedContent = JSON.parse(localStorage.getItem('trimark_content') || '{}');
    storedContent[className] = content;
    localStorage.setItem('trimark_content', JSON.stringify(storedContent));
}

function loadStoredContent() {
    const storedContent = JSON.parse(localStorage.getItem('trimark_content') || '{}');
    
    Object.keys(storedContent).forEach(className => {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
            if (element.textContent !== storedContent[className]) {
                element.textContent = storedContent[className];
            }
        });
    });
}

// Role Management System
const ROLE_TYPES = {
    administrator: { name: 'Administrator', icon: '👑', permissions: ['all'] },
    diplomatic_officer: { name: 'Diplomatic Officer', icon: '🤝', permissions: ['diplomacy', 'negotiations', 'external_relations'] },
    lead_tactician: { name: 'Lead Tactician', icon: '⚔️', permissions: ['tactics', 'strategy', 'combat_operations'] },
    field_survey_lead: { name: 'Field Survey Lead', icon: '🔍', permissions: ['exploration', 'survey', 'resource_assessment'] },
    recruiter: { name: 'Recruiter', icon: '📢', permissions: ['recruitment', 'outreach', 'member_acquisition'] },
    ambassador: { name: 'Ambassador', icon: '🌐', permissions: ['representation', 'public_relations', 'community'] },
    crew_member: { name: 'Crew Member', icon: '👥', permissions: ['operations', 'basic_combat', 'support'] },
    event_coordinator: { name: 'Event Coordinator', icon: '📅', permissions: ['events', 'scheduling', 'coordination'] }
};

let userRoles = {};
let pendingRoleRequests = [];
let tribeMembers = []; // Store tribe members data
let events = []; // Store events data
let shouldShowWelcomeScreen = true; // Control welcome screen display

// Initialize role management
function initializeRoleManagement() {
    loadUserRoles();
    loadPendingRoleRequests();
    renderCurrentRoles();
    renderPendingApprovals();
    
    // Load tribe members data
    loadTribeMembers();
    
    // Setup autocomplete for role assignment
    setupRoleAssignmentAutocomplete();
}

// Load user roles from localStorage
function loadUserRoles() {
    const storedRoles = localStorage.getItem('trimark_user_roles');
    if (storedRoles) {
        userRoles = JSON.parse(storedRoles);
    }
}

// Save user roles to localStorage
function saveUserRoles() {
    localStorage.setItem('trimark_user_roles', JSON.stringify(userRoles));
}

// Load pending role requests
function loadPendingRoleRequests() {
    const storedRequests = localStorage.getItem('trimark_pending_roles');
    if (storedRequests) {
        pendingRoleRequests = JSON.parse(storedRequests);
    }
}

// Save pending role requests
function savePendingRoleRequests() {
    localStorage.setItem('trimark_pending_roles', JSON.stringify(pendingRoleRequests));
}

   // Assign role to user
  function assignRoleToUser(characterName, role, reason) {
      if (!isAdmin) {
          alert('Only administrators can assign roles');
          return;
      }
      
      if (!characterName || !role) {
          alert('Please provide both character name and role');
          return;
      }
      
      const cleanCharacterName = characterName.trim();
      
      // Check if character is a valid tribe member
      const tribeMember = tribeMembers.find(member => 
          member.name.toLowerCase() === cleanCharacterName.toLowerCase()
      );
      
      if (!tribeMember) {
          alert('This character is not a member of Trimark Industries. Only tribe members can be assigned roles.');
          return;
      }
      
      // Check if character name already has a role
      if (userRoles[cleanCharacterName]) {
          alert('This character already has a role assigned');
          return;
      }
      
      // Assign role
      userRoles[cleanCharacterName] = {
          role: role,
          assignedBy: currentAccount,
          assignedAt: Date.now(),
          reason: reason || 'No reason provided',
          memberAddress: tribeMember.address // Store the member's address for reference
      };
      
      saveUserRoles();
      logAdminActivity(`Role Assigned: ${ROLE_TYPES[role].name}`, cleanCharacterName);
      
      // Update UI
      renderCurrentRoles();
      
      alert(`Role ${ROLE_TYPES[role].name} assigned successfully to ${cleanCharacterName}`);
      
      // Clear form
      document.getElementById('roleUserName').value = '';
      document.getElementById('roleSelect').value = '';
      document.getElementById('roleReason').value = '';
  }

 // Remove role from user
 function removeRoleFromUser(characterName) {
     if (!isAdmin) {
         alert('Only administrators can remove roles');
         return;
     }
     
     if (confirm(`Are you sure you want to remove the role from ${characterName}?`)) {
         delete userRoles[characterName];
         saveUserRoles();
         logAdminActivity('Role Removed', characterName);
         renderCurrentRoles();
         alert('Role removed successfully');
     }
 }

// Request role (for non-admins)
function requestRole(role, reason) {
    if (!currentAccount) {
        alert('Please connect your wallet first');
        return;
    }
    
    const request = {
        address: currentAccount,
        role: role,
        reason: reason,
        requestedAt: Date.now(),
        status: 'pending'
    };
    
    pendingRoleRequests.push(request);
    savePendingRoleRequests();
    renderPendingApprovals();
    
    alert('Role request submitted successfully. An administrator will review it.');
}

// Approve role request
function approveRoleRequest(requestIndex) {
    if (!isAdmin) {
        alert('Only administrators can approve role requests');
        return;
    }
    
    const request = pendingRoleRequests[requestIndex];
    
    // Assign the role
    userRoles[request.address] = {
        role: request.role,
        assignedBy: currentAccount,
        assignedAt: Date.now(),
        reason: request.reason,
        approvedFromRequest: true
    };
    
    saveUserRoles();
    
    // Remove from pending requests
    pendingRoleRequests.splice(requestIndex, 1);
    savePendingRoleRequests();
    
    logAdminActivity(`Role Request Approved: ${ROLE_TYPES[request.role].name}`, request.address);
    
    // Update UI
    renderCurrentRoles();
    renderPendingApprovals();
    
    alert('Role request approved successfully');
}

// Reject role request
function rejectRoleRequest(requestIndex) {
    if (!isAdmin) {
        alert('Only administrators can reject role requests');
        return;
    }
    
    const request = pendingRoleRequests[requestIndex];
    
    // Remove from pending requests
    pendingRoleRequests.splice(requestIndex, 1);
    savePendingRoleRequests();
    
    logAdminActivity(`Role Request Rejected: ${ROLE_TYPES[request.role].name}`, request.address);
    
    // Update UI
    renderPendingApprovals();
    
    alert('Role request rejected');
}

 // Render current roles
 function renderCurrentRoles() {
     const rolesList = document.getElementById('currentRolesList');
     if (!rolesList) return;
     
     const roleEntries = Object.entries(userRoles);
     
     if (roleEntries.length === 0) {
         rolesList.innerHTML = '<p class="no-roles">No roles assigned yet</p>';
         return;
     }
     
     rolesList.innerHTML = roleEntries.map(([characterName, roleData]) => {
         const roleInfo = ROLE_TYPES[roleData.role];
         
         return `
             <div class="role-item">
                 <div class="role-item-info">
                     <div class="role-item-address">${characterName}</div>
                     <div class="role-item-role">${roleInfo.icon} ${roleInfo.name}</div>
                     <div class="role-item-reason">Reason: ${roleData.reason}</div>
                 </div>
                 <div class="role-item-actions">
                     ${isAdmin ? `
                         <button class="role-action-btn remove" onclick="removeRoleFromUser('${characterName}')" title="Remove Role">
                             Remove
                         </button>
                     ` : ''}
                 </div>
             </div>
         `;
     }).join('');
 }

// Render pending approvals
function renderPendingApprovals() {
    const approvalsList = document.getElementById('pendingApprovalsList');
    if (!approvalsList) return;
    
    if (pendingRoleRequests.length === 0) {
        approvalsList.innerHTML = '<p class="no-approvals">No pending role requests</p>';
        return;
    }
    
    approvalsList.innerHTML = pendingRoleRequests.map((request, index) => {
        const roleInfo = ROLE_TYPES[request.role];
        
        return `
            <div class="role-item">
                <div class="role-item-info">
                    <div class="role-item-address">${request.address}</div>
                    <div class="role-item-role">${roleInfo.icon} ${roleInfo.name}</div>
                    <div class="role-item-reason">Reason: ${request.reason}</div>
                </div>
                <div class="role-item-actions">
                    ${isAdmin ? `
                        <button class="role-action-btn approve" onclick="approveRoleRequest(${index})" title="Approve Request">
                            Approve
                        </button>
                        <button class="role-action-btn reject" onclick="rejectRoleRequest(${index})" title="Reject Request">
                            Reject
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Check if user has specific permission
function hasPermission(permission) {
    if (!currentAccount) return false;
    
    const userRole = userRoles[currentAccount.toLowerCase()];
    if (!userRole) return false;
    
    const roleInfo = ROLE_TYPES[userRole.role];
    return roleInfo.permissions.includes('all') || roleInfo.permissions.includes(permission);
}

   // Get user's role
  function getUserRole(characterName) {
      if (!characterName) return null;
      return userRoles[characterName] || null;
  }

  // Load tribe members from API
  async function loadTribeMembers() {
      try {
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
          console.log(`Loaded ${tribeMembers.length} tribe members from Trimark Industries`);
          
          // Update tribe member count display if it exists
          const memberCountDisplay = document.getElementById('tribeMemberCount');
          if (memberCountDisplay) {
              memberCountDisplay.textContent = tribeMembers.length;
          }
          
      } catch (error) {
          console.error('Error loading tribe members:', error);
          tribeMembers = [];
      }
  }

  // Refresh tribe members data
  async function refreshTribeMembers() {
      await loadTribeMembers();
      // Re-setup autocomplete with fresh data
      setupRoleAssignmentAutocomplete();
      alert(`Refreshed tribe member data. Current member count: ${tribeMembers.length}`);
  }

    // Setup autocomplete for role assignment
  function setupRoleAssignmentAutocomplete() {
      const roleUserNameInput = document.getElementById('roleUserName');
      if (!roleUserNameInput) {
          console.log('Role username input not found, retrying in 1 second...');
          setTimeout(setupRoleAssignmentAutocomplete, 1000);
          return;
      }
      
      console.log('Setting up autocomplete for role assignment...');
      
      // Remove existing autocomplete container if it exists
      const existingContainer = roleUserNameInput.parentNode.querySelector('.autocomplete-container');
      if (existingContainer) {
          existingContainer.remove();
      }
      
      // Create autocomplete container
      let autocompleteContainer = document.createElement('div');
      autocompleteContainer.className = 'autocomplete-container';
      autocompleteContainer.style.display = 'none';
      roleUserNameInput.parentNode.appendChild(autocompleteContainer);
      
      // Remove existing event listeners to prevent duplicates
      const newInput = roleUserNameInput.cloneNode(true);
      roleUserNameInput.parentNode.replaceChild(newInput, roleUserNameInput);
      
      newInput.addEventListener('input', function() {
          const inputValue = this.value.toLowerCase().trim();
          console.log('Input value:', inputValue, 'Tribe members count:', tribeMembers.length);
          
          if (inputValue.length < 2) {
              autocompleteContainer.style.display = 'none';
              return;
          }
          
          // Filter tribe members that match the input
          const matches = tribeMembers.filter(member => 
              member.name.toLowerCase().includes(inputValue) &&
              !userRoles[member.name] // Don't show members who already have roles
          ).slice(0, 5); // Limit to 5 suggestions
          
          console.log('Matches found:', matches.length);
          
          if (matches.length > 0) {
              autocompleteContainer.innerHTML = matches.map(member => 
                  `<div class="autocomplete-item" data-name="${member.name}">
                      <span class="member-name">${member.name}</span>
                      <span class="member-address">${member.address.slice(0, 6)}...${member.address.slice(-4)}</span>
                  </div>`
              ).join('');
              
              autocompleteContainer.style.display = 'block';
              
              // Add click handlers to suggestions
              autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(item => {
                  item.addEventListener('click', function() {
                      const selectedName = this.getAttribute('data-name');
                      newInput.value = selectedName;
                      autocompleteContainer.style.display = 'none';
                  });
                });
            } else {
                autocompleteContainer.style.display = 'none';
            }
        });
        
        // Hide autocomplete when clicking outside
        document.addEventListener('click', function(e) {
            if (!newInput.contains(e.target) && !autocompleteContainer.contains(e.target)) {
                autocompleteContainer.style.display = 'none';
            }
        });
        
        // Hide autocomplete on focus out
        newInput.addEventListener('blur', function() {
            setTimeout(() => {
                autocompleteContainer.style.display = 'none';
            }, 200);
        });
        
        console.log('Autocomplete setup complete');
    }

// Events Management System
function initializeEvents() {
    loadEvents();
    renderEvents();
}

function loadEvents() {
    const storedEvents = localStorage.getItem('trimark_events');
    if (storedEvents) {
        events = JSON.parse(storedEvents);
    }
}

function saveEvents() {
    localStorage.setItem('trimark_events', JSON.stringify(events));
}

function createEvent(title, description, date, time, location, organizer) {
    if (!hasPermission('events')) {
        alert('Only Event Coordinators can create events');
        return;
    }
    
    const newEvent = {
        id: Date.now().toString(),
        title: title,
        description: description,
        date: date,
        time: time,
        location: location,
        organizer: organizer,
        createdAt: Date.now(),
        attendees: []
    };
    
    events.push(newEvent);
    saveEvents();
    renderEvents();
    
    logAdminActivity('Event Created', title);
    alert('Event created successfully!');
}

function deleteEvent(eventId) {
    if (!hasPermission('events')) {
        alert('Only Event Coordinators can delete events');
        return;
    }
    
    if (confirm('Are you sure you want to delete this event?')) {
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            const eventTitle = events[eventIndex].title;
            events.splice(eventIndex, 1);
            saveEvents();
            renderEvents();
            
            logAdminActivity('Event Deleted', eventTitle);
            alert('Event deleted successfully!');
        }
    }
}

function renderEvents() {
    const eventsContainer = document.getElementById('eventsList');
    if (!eventsContainer) return;
    
    if (events.length === 0) {
        eventsContainer.innerHTML = '<p class="no-events">No events scheduled</p>';
        return;
    }
    
    eventsContainer.innerHTML = events.map(event => {
        const canManage = hasPermission('events');
        const isAttending = event.attendees.includes(currentAccount);
        
        return `
            <div class="event-item">
                <div class="event-header">
                    <h3 class="event-title">${event.title}</h3>
                    ${canManage ? `<button class="event-delete-btn" onclick="deleteEvent('${event.id}')">🗑️</button>` : ''}
                </div>
                <div class="event-details">
                    <p class="event-description">${event.description}</p>
                    <div class="event-meta">
                        <span class="event-date">📅 ${event.date}</span>
                        <span class="event-time">🕐 ${event.time}</span>
                        <span class="event-location">📍 ${event.location}</span>
                        <span class="event-organizer">👤 ${event.organizer}</span>
                    </div>
                    <div class="event-attendees">
                        <span class="attendee-count">👥 ${event.attendees.length} attending</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Welcome Screen System
function showWelcomeScreen(userName, userPortrait, userRole) {
    if (!shouldShowWelcomeScreen) return;
    
    // Create welcome screen modal
    const welcomeModal = document.createElement('div');
    welcomeModal.className = 'welcome-modal';
    welcomeModal.innerHTML = `
        <div class="welcome-content">
            <div class="welcome-header">
                <h2>Welcome to Trimark Industries</h2>
                <button class="welcome-close-btn" onclick="closeWelcomeScreen()">×</button>
            </div>
            <div class="welcome-body">
                <div class="welcome-user-info">
                    <img src="${userPortrait}" alt="Character Portrait" class="welcome-portrait">
                    <div class="welcome-user-details">
                        <h3 class="welcome-user-name">${userName}</h3>
                        <div class="welcome-user-role">
                            ${userRole ? `${userRole.icon} ${userRole.name}` : '👤 No Role Assigned'}
                        </div>
                    </div>
                </div>
                <div class="welcome-message">
                    <p>Welcome back, Commander! You have successfully accessed the Trimark Industries portal.</p>
                    <p>Your role: <strong>${userRole ? userRole.name : 'No Role Assigned'}</strong></p>
                    <p>Click anywhere outside this message to continue to the site.</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(welcomeModal);
    
    // Add click outside to close functionality
    welcomeModal.addEventListener('click', function(e) {
        if (e.target === welcomeModal) {
            closeWelcomeScreen();
        }
    });
}

function closeWelcomeScreen() {
    const welcomeModal = document.querySelector('.welcome-modal');
    if (welcomeModal) {
        welcomeModal.remove();
        // Don't set localStorage flag - welcome screen will show again next time
    }
}

// Check if user has permission for specific actions
function hasPermission(action) {
    if (!currentAccount) return false;
    
    // Find user's role by wallet address
    const userRoleEntry = Object.entries(userRoles).find(([characterName, roleData]) => 
        roleData.memberAddress && roleData.memberAddress.toLowerCase() === currentAccount.toLowerCase()
    );
    
    if (!userRoleEntry) return false;
    
    const userRole = userRoleEntry[1].role;
    const roleInfo = ROLE_TYPES[userRole];
    
    if (!roleInfo) return false;
    
    return roleInfo.permissions.includes('all') || roleInfo.permissions.includes(action);
}

// Export functions for potential external use
window.TrimarkApp = {
    connectWallet,
    disconnectWallet,
    fetchEveFrontierData,
    formatEveBalance,
    formatGasBalance,
    isUserApproved,
    isAdmin,
    enableContentEditing,
    disableContentEditing,
    assignRoleToUser,
    removeRoleFromUser,
    requestRole,
    hasPermission,
    getUserRole,
    createEvent,
    deleteEvent,
    renderEvents,
    resetWelcomeScreen: () => {
        localStorage.removeItem('trimark_welcome_shown');
        sessionStorage.removeItem('trimark_welcome_shown');
        shouldShowWelcomeScreen = true;
        console.log('Welcome screen reset - will show on next wallet connection');
    }
};
