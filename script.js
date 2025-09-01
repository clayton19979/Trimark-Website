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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
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
            
            // Load approved users and check admin status
            loadApprovedUsers();
            checkAdminStatus();
            
            // Show main content since user is already connected
            showMainContent();
        } else {
            // No existing connection - show wallet connection prompt
            console.log('❌ No existing wallet connection found');
            
            // Initialize wallet button state
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Detecting Wallets...';
                connectWalletBtn.disabled = true;
            }
            
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
            
            // Show wallet connection prompt
            showWalletConnectionPrompt();
        }
         
        // Initialize role management
        initializeRoleManagement();
         
                 // Initialize events system
        initializeEvents();
        
        // Render members page if we're on it
        window.TrimarkApp.renderMembersPage();
        
        // Initialize ore sites if we're on that page
        initializeOreSites();
        
        // Welcome screen will show every time wallet is connected
        shouldShowWelcomeScreen = true;
         
         // Setup player search after a delay to ensure DOM is ready
         // Note: This will be re-setup when tribe members are loaded
         setTimeout(() => {
             setupPlayerSearch();
         }, 1000);
    }, 500);
});

// Simple Web3 Wallet Detection
let onekeyProvider = null;

// Simple wallet detection
function detectWallet() {
    console.log('🔍 Detecting available wallets...');
    
    // Check for MetaMask
    if (typeof window.ethereum !== 'undefined') {
        console.log('✅ MetaMask detected');
        if (connectWalletBtn) {
            connectWalletBtn.textContent = 'Connect MetaMask';
            connectWalletBtn.disabled = false;
        }
        walletType = 'metamask';
        return 'metamask';
    }
    
    // Check for OneKey via EIP-6963
    const onAnnounceProvider = (event) => {
        console.log('🔍 Wallet provider announced:', event.detail.info);
        
        if (event.detail.info.name === 'OneKey') {
            onekeyProvider = event.detail.provider;
            console.log('✅ OneKey wallet detected via EIP-6963!');
            walletType = 'onekey';
            
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Connect OneKey Wallet';
                connectWalletBtn.disabled = false;
            }
        }
    };

    // Listen for EIP-6963 announcements
    window.addEventListener('eip6963:announceProvider', onAnnounceProvider);
    
    // Request providers
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    
    // Check after delay
    setTimeout(() => {
        if (!onekeyProvider && !window.ethereum) {
            console.log('❌ No wallet detected');
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Install Wallet';
                connectWalletBtn.disabled = false;
            }
        }
    }, 1000);
    
    return 'none';
}

// Initialize wallet detection
function initializeWalletDetection() {
    console.log('🔍 Initializing wallet detection...');
    
    // Check for MetaMask first
    if (typeof window.ethereum !== 'undefined') {
        console.log('✅ MetaMask detected');
        if (connectWalletBtn) {
            connectWalletBtn.textContent = 'Connect MetaMask';
            connectWalletBtn.disabled = false;
        }
        walletType = 'metamask';
        
        // Check if already connected
        checkExistingConnections();
        return;
    }
    
    // Check for OneKey via EIP-6963
    const onAnnounceProvider = (event) => {
        console.log('🔍 Wallet provider announced:', event.detail.info);
        
        if (event.detail.info.name === 'OneKey') {
            onekeyProvider = event.detail.provider;
            console.log('✅ OneKey wallet detected via EIP-6963!');
            walletType = 'onekey';
            
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Connect OneKey Wallet';
                connectWalletBtn.disabled = false;
            }
            
            // Check if already connected
            checkExistingConnections();
        }
    };

    // Listen for EIP-6963 announcements
    window.addEventListener('eip6963:announceProvider', onAnnounceProvider);
    
    // Request providers
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    
    // Check after delay
    setTimeout(() => {
        if (!onekeyProvider && !window.ethereum) {
            console.log('❌ No wallet detected');
            if (connectWalletBtn) {
                connectWalletBtn.textContent = 'Install Wallet';
                connectWalletBtn.disabled = false;
            }
        }
    }, 1000);
}





// Show wallet connection prompt
function showWalletConnectionPrompt() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div class="wallet-prompt" style="text-align: center; padding: 100px 20px; color: #ccc;">
                <div style="margin-bottom: 40px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🔗</div>
                    <h2 style="font-size: 2.5rem; color: #00d4ff; margin-bottom: 20px; font-family: 'Orbitron', sans-serif;">WALLET CONNECTION REQUIRED</h2>
                    <p style="font-size: 1.2rem; margin-bottom: 30px; max-width: 600px; margin-left: auto; margin-right: auto;">
                        Connect your Web3 wallet to access Trimark Industries dashboard and verify your EVE Frontier character.
                    </p>
                    <p style="font-size: 1rem; color: #888; margin-bottom: 40px;">
                        Supported wallets: MetaMask, OneKey, and other EIP-6963 compatible wallets
                    </p>
                </div>
                <div style="margin-bottom: 40px;">
                    <button id="connectWalletPrompt" class="wallet-btn" style="font-size: 1.2rem; padding: 15px 30px;">
                        <span class="wallet-icon">🔗</span>
                        Connect Wallet
                    </button>
                </div>
                <div style="font-size: 0.9rem; color: #666;">
                    <p>Don't have a wallet? <a href="https://metamask.io/download/" target="_blank" style="color: #00d4ff;">Install MetaMask</a> or <a href="https://onekey.so/download" target="_blank" style="color: #00d4ff;">OneKey Wallet</a></p>
                </div>
            </div>
        `;
        
        // Add event listener to the prompt button
        const promptBtn = document.getElementById('connectWalletPrompt');
        if (promptBtn) {
            promptBtn.addEventListener('click', connectWallet);
        }
    }
}

// Show main content
function showMainContent() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        // Restore the original content
        mainContent.innerHTML = `
            <section id="dashboard" class="dashboard-section">
                <h2 class="section-title">Welcome to Trimark Industries</h2>
                <p style="text-align: center; color: #ccc; font-size: 1.2rem; margin-bottom: 60px; max-width: 800px; margin-left: auto; margin-right: auto;">
                    Welcome back, fellow frontier builders. Access your corporation dashboard, 
                    view current operations, and stay updated on our latest industrial ventures 
                    across the EVE Frontier universe.
                </p>
                <div class="dashboard-grid">
                    <a href="home.html" class="dashboard-card">
                        <div class="card-icon">🏠</div>
                        <h3>Home</h3>
                        <p>Welcome page with corporation overview and quick access to key areas.</p>
                    </a>
                    <a href="roles.html" class="dashboard-card">
                        <div class="card-icon">👥</div>
                        <h3>Role Management</h3>
                        <p>Manage member roles, assign responsibilities, and control access to different areas of operations.</p>
                    </a>
                    <a href="members.html" class="dashboard-card">
                        <div class="card-icon">👥</div>
                        <h3>Members</h3>
                        <p>View complete roster of all tribe members, join dates, and time in service.</p>
                    </a>
                    <a href="events.html" class="dashboard-card">
                        <div class="card-icon">📅</div>
                        <h3>Corporation Events</h3>
                        <p>Stay informed about scheduled operations, training sessions, and corporate events.</p>
                    </a>
                    <a href="about.html" class="dashboard-card">
                        <div class="card-icon">📊</div>
                        <h3>Member Resources</h3>
                        <p>Access operations dashboard, mission board, and corporation tools.</p>
                    </a>
                    <a href="ore-sites.html" class="dashboard-card">
                        <div class="card-icon">⛏️</div>
                        <h3>Ore Sites</h3>
                        <p>Monitor mining operations, report new ore sites, and track resource yields across our territories.</p>
                    </a>
                </div>
            </section>
        `;
        
        // Show footer
        const footer = document.querySelector('.footer');
        if (footer) {
            footer.style.display = 'block';
        }
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
    console.log('🔍 Ethers version:', ethers.version);
    console.log('🔍 Available ethers methods:', Object.keys(ethers));
    
    // Initialize admin system
    loadApprovedUsers();
    
    // Show wallet gate immediately - no content visible until wallet is connected
    showWalletGate();
    
    // Auto-detect and connect wallet on page load
    autoConnectWallet();
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
        disconnectWalletBtn.addEventListener('click', logoutAndRedirect);
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
    
    // Setup player search when roles section is accessed
    if (e.target.getAttribute('href') === '#roles') {
        setTimeout(() => {
            setupPlayerSearch();
        }, 500);
    }
}

// Connect wallet function - exactly like Architects site
async function connectWallet() {
    console.log('🔌 Connect wallet function called!');
    console.log('🔌 Current state:', { isConnecting, walletType, currentAccount });
    console.log('🔌 DOM elements:', { 
        connectWalletBtn: !!connectWalletBtn, 
        userProfile: !!userProfile 
    });
    
    try {
        // Update button to show loading state
        if (connectWalletBtn) {
            connectWalletBtn.textContent = 'Connecting...';
            connectWalletBtn.disabled = true;
        }
        isConnecting = true;
        error = null;

        console.log('🔌 Attempting wallet connection...');

        // Check if ethers is available
        if (typeof ethers === 'undefined') {
            throw new Error('Ethers library not loaded. Please refresh the page and try again.');
        }

        // Try to detect existing wallet first - exactly like Architects site
        console.log('🔌 Calling detectWalletType...');
        const detectedWallet = await detectWalletType()
        console.log('🔌 Detected wallet type:', detectedWallet);
        
        if (detectedWallet === 'none') {
            throw new Error('Please install MetaMask or another Web3 wallet!')
        }

        let ethereumProvider = null
        
        // Try to get the provider - exactly like Architects site
        if (detectedWallet === 'metamask' || detectedWallet === 'injected') {
            ethereumProvider = window.ethereum
        } else if (detectedWallet === 'onekey') {
            ethereumProvider = onekeyProvider
        }

        if (!ethereumProvider) {
            throw new Error('Unable to connect to wallet')
        }

        console.log('🔌 Connecting to wallet provider:', detectedWallet)

        // Request account access - exactly like Architects site
        const accounts = await ethereumProvider.request({ 
            method: 'eth_requestAccounts' 
        })

        if (accounts.length === 0) {
            throw new Error('No accounts found!')
        }

        // Create ethers provider and signer - exactly like Architects site
        const ethersProvider = new ethers.BrowserProvider(ethereumProvider)
        const ethersSigner = await ethersProvider.getSigner()
        const network = await ethersProvider.getNetwork()

        // Set state
        currentAccount = accounts[0];
        provider = ethersProvider;
        signer = ethersSigner;
        chainId = Number(network.chainId);
        isConnected = true;

        console.log('✅ Wallet connected successfully:', accounts[0])

        // Update UI
        await updateUserProfile();
        
        // Load approved users and check admin status
        loadApprovedUsers();
        checkAdminStatus();
        
        // Set up wallet event listeners - exactly like Architects site
        ethereumProvider.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet()
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
                    showMainContent();
                }
            }
        })

        // Listen for chain changes - exactly like Architects site
        ethereumProvider.on('chainChanged', (chainId) => {
            chainId = parseInt(chainId, 16)
            window.location.reload() // Reload to ensure clean state
        })

        // Listen for disconnect - exactly like Architects site
        ethereumProvider.on('disconnect', () => {
            disconnectWallet()
        })

        // Show success message
        const successMsg = `${detectedWallet === 'onekey' ? 'OneKey' : 'MetaMask'} wallet connected successfully! Account: ` + currentAccount.slice(0, 6) + '...' + currentAccount.slice(-4);
        console.log('✅ ' + successMsg);
        alert(successMsg);

    } catch (err) {
        error = err.message;
        console.error('❌ Error connecting wallet:', err);
        alert('Failed to connect wallet: ' + err.message);
    } finally {
        isConnecting = false;
        if (connectWalletBtn) {
            if (walletType === 'onekey') {
                connectWalletBtn.textContent = 'Connect OneKey Wallet';
            } else {
                connectWalletBtn.textContent = 'Connect Wallet';
            }
            connectWalletBtn.disabled = false;
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
            const roleDisplay = userRole ? ROLE_TYPES[userRole].name : 'Member';
            userAddress.textContent = roleDisplay;
            
            // Store user data for later use
            localStorage.setItem('trimark_user_data', JSON.stringify(userData));
            
            // Restore main content visibility for users with access
            showMainContent();
            
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
            
            // Load tribe members for role management
            loadTribeMembers();
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
    
    // Hide main content and footer, show wallet connection prompt
    showWalletConnectionPrompt();
    
    console.log('🔌 Wallet disconnected successfully');
}

// Logout and redirect to landing page
function logoutAndRedirect() {
    console.log('🚪 Logging out and redirecting to landing page...');
    
    // Clear all wallet connection data
    localStorage.removeItem('walletConnected');
    localStorage.removeItem('walletType');
    localStorage.removeItem('walletAccount');
    localStorage.removeItem('trimark_user_data');
    
    // Reset all state variables
    currentAccount = null;
    provider = null;
    signer = null;
    isConnected = false;
    chainId = null;
    error = null;
    isAdmin = false;
    onekeyProvider = null;
    walletType = null;
    
    // Redirect to landing page
    window.location.href = 'landing.html';
}

// Check for existing wallet connections - exactly like Architects site
async function checkExistingConnections() {
    try {
        const detectedWallet = await detectWalletType()
        
        if (detectedWallet !== 'none') {
            let ethereumProvider = null
            
            if (detectedWallet === 'metamask' || detectedWallet === 'injected') {
                ethereumProvider = window.ethereum
            } else if (detectedWallet === 'onekey') {
                ethereumProvider = onekeyProvider
            }
            
            if (ethereumProvider) {
                const accounts = await ethereumProvider.request({ 
                    method: 'eth_accounts' 
                })
                
                if (accounts.length > 0) {
                    const ethersProvider = new ethers.BrowserProvider(ethereumProvider)
                    const ethersSigner = await ethersProvider.getSigner()
                    const network = await ethersProvider.getNetwork()

                    currentAccount = accounts[0]
                    provider = ethersProvider
                    signer = ethersSigner
                    chainId = Number(network.chainId)
                    isConnected = true
                    
                    console.log('✅ Found existing wallet connection:', accounts[0])
                    
                    // Update UI
                    await updateUserProfile();
                    
                    // Load approved users and check admin status
                    loadApprovedUsers();
                    checkAdminStatus();
                    
                    // Set up event listeners - exactly like Architects site
                    ethereumProvider.on('accountsChanged', (accounts) => {
                        if (accounts.length === 0) {
                            disconnectWallet()
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
                                showMainContent();
                            }
                        }
                    })

                    // Listen for chain changes - exactly like Architects site
                    ethereumProvider.on('chainChanged', (chainId) => {
                        chainId = parseInt(chainId, 16)
                        window.location.reload()
                    })

                    // Listen for disconnect - exactly like Architects site
                    ethereumProvider.on('disconnect', () => {
                        disconnectWallet()
                    })
                }
            }
        }
    } catch (err) {
        console.error('Error checking wallet connection:', err)
    }
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
    const animateElements = document.querySelectorAll('.about-card, .contact-form');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Utility function to format EVE balance
function formatEveBalance(balanceInWei) {
    const balance = ethers.formatEther(balanceInWei);
    return parseFloat(balance).toFixed(2);
}

// Utility function to format gas balance
function formatGasBalance(balanceInWei) {
    const balance = ethers.formatEther(balanceInWei);
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
    
    // Setup player search for role assignment
    setupPlayerSearch();
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
          console.log('First few tribe members:', tribeMembers.slice(0, 3));
          
          // Update tribe member count display if it exists
          const memberCountDisplay = document.getElementById('tribeMemberCount');
          if (memberCountDisplay) {
              memberCountDisplay.textContent = tribeMembers.length;
          }
          
          // Setup player search with the loaded tribe members
          setupPlayerSearch();
          
          // Render members page if we're on it
          if (window.location.pathname.includes('members.html')) {
              renderMembersList();
          }
          
      } catch (error) {
          console.error('Error loading tribe members:', error);
          tribeMembers = [];
      }
  }

  // Refresh tribe members data
  async function refreshTribeMembers() {
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
                // Removed the filter that excluded players with existing roles
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
        
        // Calculate join dates and time in tribe
        const currentDate = new Date();
        const membersWithDates = tribeMembers.map(member => {
            // Generate a random join date for demonstration (since we don't have real join dates)
            const daysAgo = Math.floor(Math.random() * 365) + 1; // 1-365 days ago
            const joinDate = new Date(currentDate.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
            
            return {
                ...member,
                joinDate: joinDate,
                timeInTribe: daysAgo
            };
        });
        
        // Sort members by name by default
        membersWithDates.sort((a, b) => a.name.localeCompare(b.name));
        
        // Update total count
        totalMemberCount.textContent = membersWithDates.length;
        
        // Render members
        membersList.innerHTML = membersWithDates.map(member => {
            const joinDateStr = member.joinDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const timeInTribeStr = member.timeInTribe === 1 ? '1 day' : `${member.timeInTribe} days`;
            
            return `
                <div class="member-item" data-name="${member.name.toLowerCase()}" data-join-date="${member.joinDate.getTime()}" data-time-in-tribe="${member.timeInTribe}">
                    <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
                    <div class="member-details">
                        <div class="member-name">${member.name}</div>
                        <div class="member-address">${member.address.slice(0, 6)}...${member.address.slice(-4)}</div>
                    </div>
                    <div class="member-join-date">${joinDateStr}</div>
                    <div class="member-time-in-tribe">${timeInTribeStr}</div>
                </div>
            `;
        }).join('');
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
                    const dateA = parseInt(a.dataset.joinDate);
                    const dateB = parseInt(b.dataset.joinDate);
                    return dateA - dateB;
                    
                case 'timeInTribe':
                    const timeA = parseInt(a.dataset.timeInTribe);
                    const timeB = parseInt(b.dataset.timeInTribe);
                    return timeB - timeA; // Newest first
                    
                default:
                    return 0;
            }
        });
        
        // Re-append sorted items
        memberItems.forEach(item => membersList.appendChild(item));
    }

// Ore Sites Functions
function initializeOreSites() {
    const currentPage = window.location.pathname.split('/').pop() || window.location.href.split('/').pop();
    console.log('Current page detected:', currentPage);
    console.log('Full URL:', window.location.href);
    
    if (currentPage === 'ore-sites.html' || window.location.href.includes('ore-sites.html')) {
        console.log('Initializing Ore Sites page...');
        renderOreSites();
        setupOreSitesEventListeners();
    }
}

        // Ore Sites Functions
        function renderOreSites() {
            const oreSitesList = document.getElementById('oreSitesList');
            const totalSites = document.getElementById('totalSites');
            const activeSites = document.getElementById('activeSites');
            
            if (!oreSitesList) return;
            
            // Load ore sites from localStorage
            const oreSites = JSON.parse(localStorage.getItem('trimark_ore_sites') || '[]');
            
            // Update statistics
            if (totalSites) totalSites.textContent = oreSites.length;
            if (activeSites) activeSites.textContent = oreSites.filter(site => site.status.includes('Active')).length;
            
            // Render ore sites list
            oreSitesList.innerHTML = '';
            
            if (oreSites.length === 0) {
                oreSitesList.innerHTML = `
                    <div class="no-ore-sites">
                        <p>No ore sites have been reported yet.</p>
                        <p>Click "Report New Site" to add the first ore site!</p>
                    </div>
                `;
                return;
            }
            
            oreSites.forEach(site => {
                const siteElement = document.createElement('div');
                siteElement.className = 'mining-site-item';
                siteElement.dataset.id = site.id;
                siteElement.dataset.status = site.status;
                siteElement.innerHTML = `
                    <div class="mining-site-header">
                        <h3 class="mining-site-name">${site.name}</h3>
                        <span class="mining-site-status ${site.status.toLowerCase().includes('active') ? 'active' : 'pending'}">${site.status}</span>
                    </div>
                    <div class="mining-site-details">
                        <div class="detail-item">
                            <span class="detail-label">Ore Type</span>
                            <span class="detail-value">${site.oreType}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">System</span>
                            <span class="detail-value">${site.system}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Yield Rate</span>
                            <span class="detail-value">${site.yieldRate}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Security</span>
                            <span class="detail-value">${site.securityStatus}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Reported By</span>
                            <span class="detail-value">${site.reportedBy || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Updated</span>
                            <span class="detail-value">${new Date(site.lastUpdated).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="mining-site-notes">${site.notes}</div>
                    <div class="mining-site-actions">
                        <button class="delete-ore-site" data-id="${site.id}">🗑️ Delete</button>
                    </div>
                `;
                oreSitesList.appendChild(siteElement);
            });
        }
        
        // Update statistics
            const activeCount = oreSites.filter(site => site.status.includes('Active')).length;
            const totalYieldValue = oreSites.reduce((sum, site) => {
                return sum + parseInt(site.yieldRate.replace(/[^\d]/g, ''));
            }, 0);
            
            totalSites.textContent = oreSites.length;
            activeSites.textContent = activeCount;
            totalYield.textContent = totalYieldValue.toLocaleString();
            avgSecurity.textContent = "0.0"; // Placeholder
            
            // Render ore sites
            oreSitesList.innerHTML = oreSites.map(site => {
                const statusClass = site.status.includes('Active') ? 'active' : 'pending';
                const lastUpdated = new Date(site.lastUpdated).toLocaleString();
                
                return `
                    <div class="ore-site-item" data-name="${site.name.toLowerCase()}" data-ore="${site.oreType.toLowerCase()}" data-status="${statusClass}">
                        <div class="ore-site-header">
                            <div class="ore-site-name">${site.name}</div>
                            <div class="ore-site-status ${statusClass}">${site.status}</div>
                        </div>
                        <div class="ore-site-details">
                            <div class="detail-item">
                                <span class="detail-label">Ore Type</span>
                                <span class="detail-value">${site.oreType}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">System</span>
                                <span class="detail-value">${site.system}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Yield Rate</span>
                                <span class="detail-value">${site.yieldRate}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Security</span>
                                <span class="detail-value">${site.securityStatus}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Active Miners</span>
                                <span class="detail-value">${site.activeMiners}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Updated</span>
                                <span class="detail-value">${lastUpdated}</span>
                            </div>
                        </div>
                        <div class="ore-site-notes">${site.notes}</div>
                        <div class="ore-site-actions">
                            <button class="admin-btn secondary delete-ore-site" data-id="${site.id}">Delete Site</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        function setupOreSitesEventListeners() {
            const searchInput = document.getElementById('oreSiteSearch');
            const filterSelect = document.getElementById('oreSiteFilter');
            const sortSelect = document.getElementById('oreSiteSort');
            const reportBtn = document.getElementById('reportNewSite');
            const reportModal = document.getElementById('reportOreSiteModal');
            const closeModal = document.getElementById('closeReportModal');
            const cancelBtn = document.getElementById('cancelReport');
            const form = document.getElementById('oreSiteForm');
            const systemInput = document.getElementById('systemName');
            const systemSearchResults = document.getElementById('systemSearchResults');
            
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    filterOreSites(this.value);
                });
            }
            
            if (filterSelect) {
                filterSelect.addEventListener('change', function() {
                    filterOreSites('', this.value);
                });
            }
            
            if (sortSelect) {
                sortSelect.addEventListener('change', function() {
                    sortOreSites(this.value);
                });
            }
            
            if (reportBtn) {
                reportBtn.addEventListener('click', function() {
                    reportModal.classList.remove('hidden');
                });
            }
            
            if (closeModal) {
                closeModal.addEventListener('click', function() {
                    reportModal.classList.add('hidden');
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    reportModal.classList.add('hidden');
                });
            }
            
            // System search functionality
            if (systemInput && systemSearchResults) {
            // Function to search systems using the systems-data.js
            function searchSystems(query) {
                // Check if the searchSystems function from systems-data.js is available
                if (typeof window.searchSystems === 'function') {
                    const results = window.searchSystems(query);
                    displaySystemSearchResults(results);
                } else {
                    // Fallback to local search if systems-data.js is not loaded
                    const results = localSearchSystems(query);
                    displaySystemSearchResults(results);
                }
            }
            
            // Local fallback search function
            function localSearchSystems(query) {
                const queryLower = query.toLowerCase();
                const systems = [
                    "Jita", "Amarr", "Dodixie", "Rens", "Hek", "Perimeter", "Urlen", "Maurasi", "Sasta", "Tama", "Rancer", "Eha"
                ];
                
                return systems
                    .filter(system => system.toLowerCase().includes(queryLower))
                    .map(system => ({ name: system, id: system.toLowerCase().replace(/\s+/g, '_') }))
                    .slice(0, 10);
            }
            
            function displaySystemSearchResults(results) {
                if (results.length === 0) {
                    systemSearchResults.innerHTML = '<div class="system-search-item">No systems found</div>';
                } else {
                    systemSearchResults.innerHTML = results.map(system => `
                        <div class="system-search-item" data-system-name="${system.name}">
                            <span class="system-name">${system.name}</span>
                            <span class="system-id">ID: ${system.id}</span>
                        </div>
                    `).join('');
                    
                    // Add click handlers for system selection
                    systemSearchResults.querySelectorAll('.system-search-item').forEach(item => {
                        item.addEventListener('click', function() {
                            const systemName = this.dataset.systemName;
                            systemInput.value = systemName;
                            systemSearchResults.classList.add('hidden');
                        });
                    });
                }
                
                systemSearchResults.classList.remove('hidden');
            }
                systemInput.addEventListener('input', function() {
                    const query = this.value.trim();
                    if (query.length >= 2) {
                        searchSystems(query);
                    } else {
                        systemSearchResults.classList.add('hidden');
                    }
                });
                
                systemInput.addEventListener('focus', function() {
                    if (this.value.trim().length >= 2) {
                        searchSystems(this.value.trim());
                    }
                });
                
                // Hide results when clicking outside
                document.addEventListener('click', function(e) {
                    if (!systemInput.contains(e.target) && !systemSearchResults.contains(e.target)) {
                        systemSearchResults.classList.add('hidden');
                    }
                });
            }
            
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    // Get form data
                    const siteName = document.getElementById('siteName').value;
                    const systemName = document.getElementById('systemName').value;
                    const oreType = document.getElementById('oreType').value;
                    const estimatedYield = document.getElementById('estimatedYield').value;
                    const securityStatus = document.getElementById('securityStatus').value;
                    const siteNotes = document.getElementById('siteNotes').value;
                    
                    if (!siteName || !systemName || !oreType || !estimatedYield || !securityStatus) {
                        alert('Please fill in all required fields.');
                        return;
                    }
                    
                    // Create new ore site object
                    const newOreSite = {
                        id: 'ore_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                        name: siteName,
                        oreType: oreType,
                        system: systemName,
                        yieldRate: estimatedYield + ' m³/hr',
                        securityStatus: securityStatus,
                        status: 'Active',
                        lastUpdated: new Date().toISOString(),
                        notes: siteNotes || 'No additional notes.',
                        reportedBy: currentUser?.name || 'Unknown'
                    };
                    
                    // Load existing ore sites and add new one
                    const existingOreSites = JSON.parse(localStorage.getItem('trimark_ore_sites') || '[]');
                    existingOreSites.push(newOreSite);
                    
                    // Save back to localStorage
                    localStorage.setItem('trimark_ore_sites', JSON.stringify(existingOreSites));
                    
                    // Close modal and reset form
                    reportModal.classList.add('hidden');
                    form.reset();
                    
                    // Refresh the ore sites display
                    renderOreSites();
                    
                    alert('Ore site report submitted successfully!');
                });
            }
            
            // Delete ore site functionality
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('delete-ore-site')) {
                    const siteId = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this ore site?')) {
                        deleteOreSite(siteId);
                    }
                }
            });
        }
        
        function filterOreSites(searchTerm = '', filterType = 'all') {
            const items = document.querySelectorAll('.ore-site-item');
            const searchLower = searchTerm.toLowerCase();
            
            items.forEach(item => {
                const name = item.querySelector('.ore-site-name').textContent.toLowerCase();
                const oreType = item.querySelector('.detail-item:nth-child(1) .detail-value').textContent.toLowerCase();
                const status = item.dataset.status;
                
                let show = true;
                
                // Search filter
                if (searchTerm && !name.includes(searchLower) && !oreType.includes(searchLower)) {
                    show = false;
                }
                
                // Status filter
                if (filterType !== 'all') {
                    if (filterType === 'active' && !status.includes('active')) show = false;
                    else if (filterType === 'high-sec' && !item.querySelector('.detail-item:nth-child(4) .detail-value').textContent.includes('High')) show = false;
                    else if (filterType === 'low-sec' && !item.querySelector('.detail-item:nth-child(4) .detail-value').textContent.includes('Medium')) show = false;
                    else if (filterType === 'null-sec' && !item.querySelector('.detail-item:nth-child(4) .detail-value').textContent.includes('Low')) show = false;
                }
                
                item.style.display = show ? 'block' : 'none';
            });
        }
        
        function sortOreSites(sortBy) {
            const list = document.getElementById('oreSitesList');
            if (!list) return;
            
            const items = Array.from(list.querySelectorAll('.ore-site-item'));
            
            items.sort((a, b) => {
                switch (sortBy) {
                    case 'name':
                        const nameA = a.querySelector('.ore-site-name').textContent;
                        const nameB = b.querySelector('.ore-site-name').textContent;
                        return nameA.localeCompare(nameB);
                    case 'yield':
                        const yieldA = parseInt(a.querySelector('.detail-item:nth-child(3) .detail-value').textContent.replace(/[^\d]/g, ''));
                        const yieldB = parseInt(b.querySelector('.detail-item:nth-child(3) .detail-value').textContent.replace(/[^\d]/g, ''));
                        return yieldB - yieldA;
                    case 'ore-type':
                        const oreA = a.querySelector('.detail-item:nth-child(1) .detail-value').textContent;
                        const oreB = b.querySelector('.detail-item:nth-child(1) .detail-value').textContent;
                        return oreA.localeCompare(oreB);
                    case 'status':
                        const statusA = a.dataset.status;
                        const statusB = b.dataset.status;
                        return statusB.localeCompare(statusA);
                    default:
                        return 0;
                }
            });
            
            items.forEach(item => list.appendChild(item));
        }
        
        function deleteOreSite(siteId) {
            // Load existing ore sites from localStorage
            const existingOreSites = JSON.parse(localStorage.getItem('trimark_ore_sites') || '[]');
            
            // Remove the site with the matching ID
            const updatedOreSites = existingOreSites.filter(site => site.id !== siteId);
            
            // Save back to localStorage
            localStorage.setItem('trimark_ore_sites', JSON.stringify(updatedOreSites));
            
            // Refresh the display
            renderOreSites();
        }
        

        
        // Mining Sites Functions
        function renderMiningSites() {
    const miningSitesList = document.getElementById('miningSitesList');
    const totalSites = document.getElementById('totalSites');
    const activeSites = document.getElementById('activeSites');
    const totalYield = document.getElementById('totalYield');
    const avgSecurity = document.getElementById('avgSecurity');
    
    if (!miningSitesList) return;
    
    // Mock data for mining sites
    const miningSites = [
        {
            id: "mining_alpha_001",
            name: "Perimeter - Moon 4",
            resource: "Veldspar",
            yieldRate: "12,500 m³/hr",
            securityStatus: "Green (1.0)",
            activeMiners: 8,
            status: "Active",
            lastUpdated: "2024-07-20T14:30:00Z",
            notes: "High-yield belt, stable operations."
        },
        {
            id: "mining_beta_002",
            name: "Null-Sec - J-Space Anomaly",
            resource: "Mercoxit",
            yieldRate: "3,200 m³/hr",
            securityStatus: "Red (0.0)",
            activeMiners: 3,
            status: "Active (High Alert)",
            lastUpdated: "2024-07-20T14:25:15Z",
            notes: "Frequent pirate probes detected. Fleet on standby."
        },
        {
            id: "mining_gamma_003",
            name: "Low-Sec - R-3000 Asteroid Field",
            resource: "Scordite, Pyroxeres",
            yieldRate: "7,800 m³/hr",
            securityStatus: "Yellow (0.4)",
            activeMiners: 5,
            status: "Active",
            lastUpdated: "2024-07-20T14:15:40Z",
            notes: "Minor local aggression, easily managed."
        },
        {
            id: "mining_delta_004",
            name: "High-Sec - Bourynes V",
            resource: "Plagioclase",
            yieldRate: "9,100 m³/hr",
            securityStatus: "Green (0.8)",
            activeMiners: 6,
            status: "Active",
            lastUpdated: "2024-07-20T14:00:00Z",
            notes: "Routine operations, no issues."
        },
        {
            id: "mining_epsilon_005",
            name: "Wormhole - C5 Anomaly",
            resource: "Carbonaceous, Silicaceous",
            yieldRate: "15,000 m³/hr",
            securityStatus: "Red (0.0)",
            activeMiners: 4,
            status: "Active",
            lastUpdated: "2024-07-20T13:45:00Z",
            notes: "Exotic materials, high value. Escort required."
        }
    ];
    
    // Update statistics
    const activeCount = miningSites.filter(site => site.status.includes('Active')).length;
    const totalYieldValue = miningSites.reduce((sum, site) => {
        return sum + parseInt(site.yieldRate.replace(/[^\d]/g, ''));
    }, 0);
    const avgSecValue = miningSites.reduce((sum, site) => {
        const sec = parseFloat(site.securityStatus.match(/[\d.]+/)[0]);
        return sum + sec;
    }, 0) / miningSites.length;
    
    totalSites.textContent = miningSites.length;
    activeSites.textContent = activeCount;
    totalYield.textContent = totalYieldValue.toLocaleString();
    avgSecurity.textContent = avgSecValue.toFixed(1);
    
    // Render mining sites
    miningSitesList.innerHTML = miningSites.map(site => {
        const statusClass = site.status.includes('Active') ? 'active' : 'pending';
        const lastUpdated = new Date(site.lastUpdated).toLocaleString();
        
        return `
            <div class="mining-site-item" data-name="${site.name.toLowerCase()}" data-resource="${site.resource.toLowerCase()}" data-status="${statusClass}">
                <div class="mining-site-header">
                    <div class="mining-site-name">${site.name}</div>
                    <div class="mining-site-status ${statusClass}">${site.status}</div>
                </div>
                <div class="mining-site-details">
                    <div class="detail-item">
                        <span class="detail-label">Resource</span>
                        <span class="detail-value">${site.resource}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Yield Rate</span>
                        <span class="detail-value">${site.yieldRate}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Security</span>
                        <span class="detail-value">${site.securityStatus}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Active Miners</span>
                        <span class="detail-value">${site.activeMiners}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Last Updated</span>
                        <span class="detail-value">${lastUpdated}</span>
                    </div>
                </div>
                <div class="mining-site-notes">${site.notes}</div>
            </div>
        `;
    }).join('');
}

function setupMiningSitesEventListeners() {
    const searchInput = document.getElementById('miningSiteSearch');
    const filterSelect = document.getElementById('miningSiteFilter');
    const sortSelect = document.getElementById('miningSiteSort');
    const reportBtn = document.getElementById('reportNewSite');
    const reportModal = document.getElementById('reportMiningSiteModal');
    const closeModal = document.getElementById('closeReportModal');
    const cancelBtn = document.getElementById('cancelReport');
    const form = document.getElementById('miningSiteForm');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterMiningSites(this.value);
        });
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            filterMiningSites('', this.value);
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            sortMiningSites(this.value);
        });
    }
    
    if (reportBtn) {
        reportBtn.addEventListener('click', function() {
            reportModal.classList.remove('hidden');
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            reportModal.classList.add('hidden');
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            reportModal.classList.add('hidden');
        });
    }
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            // Handle form submission here
            alert('Mining site report submitted successfully!');
            reportModal.classList.add('hidden');
            form.reset();
        });
    }
}

function filterMiningSites(searchTerm = '', filterType = 'all') {
    const items = document.querySelectorAll('.mining-site-item');
    const searchLower = searchTerm.toLowerCase();
    
    items.forEach(item => {
        const name = item.querySelector('.mining-site-name').textContent.toLowerCase();
        const resource = item.querySelector('.detail-item:nth-child(1) .detail-value').textContent.toLowerCase();
        const status = item.dataset.status;
        
        let show = true;
        
        // Search filter
        if (searchTerm && !name.includes(searchLower) && !resource.includes(searchLower)) {
            show = false;
        }
        
        // Status filter
        if (filterType !== 'all') {
            if (filterType === 'active' && !status.includes('active')) show = false;
            else if (filterType === 'high-sec' && !item.querySelector('.detail-value').textContent.includes('Green')) show = false;
            else if (filterType === 'low-sec' && !item.querySelector('.detail-value').textContent.includes('Yellow')) show = false;
            else if (filterType === 'null-sec' && !item.querySelector('.detail-value').textContent.includes('Red')) show = false;
        }
        
        item.style.display = show ? 'block' : 'none';
    });
}

function sortMiningSites(sortBy) {
    const list = document.getElementById('miningSitesList');
    if (!list) return;
    
    const items = Array.from(list.querySelectorAll('.mining-site-item'));
    
    items.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                const nameA = a.querySelector('.mining-site-name').textContent;
                const nameB = b.querySelector('.mining-site-name').textContent;
                return nameA.localeCompare(nameB);
            case 'yield':
                const yieldA = parseInt(a.querySelector('.detail-item:nth-child(2) .detail-value').textContent.replace(/[^\d]/g, ''));
                const yieldB = parseInt(b.querySelector('.detail-item:nth-child(2) .detail-value').textContent.replace(/[^\d]/g, ''));
                return yieldB - yieldA;
            case 'security':
                const secA = parseFloat(a.querySelector('.detail-item:nth-child(3) .detail-value').textContent.match(/[\d.]+/)[0]);
                const secB = parseFloat(b.querySelector('.detail-item:nth-child(3) .detail-value').textContent.match(/[\d.]+/)[0]);
                return secA - secB;
            case 'status':
                const statusA = a.dataset.status;
                const statusB = b.dataset.status;
                return statusB.localeCompare(statusA);
            default:
                return 0;
        }
    });
    
    items.forEach(item => list.appendChild(item));
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
                            ${userRole ? `${userRole.icon} ${userRole.name}` : '👤 Member'}
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
    },
    
    debugPlayerSearch: () => {
        console.log('=== Player Search Debug Info ===');
        console.log('Tribe members loaded:', tribeMembers);
        console.log('Tribe members count:', tribeMembers ? tribeMembers.length : 'undefined');
        console.log('Role username input exists:', !!document.getElementById('roleUserName'));
        console.log('Search container exists:', !!document.querySelector('.player-search-container'));
        console.log('User roles:', userRoles);
        console.log('==============================');
    },
    
    renderMembersPage: () => {
        if (window.location.pathname.includes('members.html')) {
            renderMembersList();
            setupMembersPageEventListeners();
        }
    }
};

// The Architect's Signature - Implementation Script
// This script implements three different methods to hide the signature

// Method 1: Developer Console Logging
// When the developer console is opened, this will log the signature
function injectConsoleSignature() {
    // Create a cryptic message with distinct styling
    const crypticMessage = '%cA mark from The Architect.';
    const signatureSVG = `<div style="display: flex; justify-content: center; align-items: center; background-color: #0A0A0A; padding: 20px; border-radius: 8px;">
        <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- The Fragmented Shell -->
            <path d="M50 0L86.6025 25V75L50 100L13.3975 75V25L50 0Z" stroke="#D119C6" stroke-width="2" fill="none" stroke-dasharray="10, 5"/>
            <path d="M50 0L50 100" stroke="#D119C6" stroke-width="2" stroke-dasharray="10, 5"/>
            <path d="M13.3975 75L86.6025 25" stroke="#D119C6" stroke-width="2" stroke-dasharray="10, 5"/>
            <path d="M13.3975 25L86.6025 75" stroke="#D119C6" stroke-width="2" stroke-dasharray="10, 5"/>
            <!-- The Perfect Core -->
            <polygon points="50,20 80,50 50,80 20,50" fill="#D119C6"/>
            <!-- Center of the core -->
            <circle cx="50" cy="50" r="3" fill="#0A0A0A"/>
        </svg>
    </div>`;
    
    // Log the signature with custom styling
    console.log(crypticMessage, 'color: #D119C6; font-size: 16px; font-weight: bold; font-family: monospace;');
    console.log('Signature SVG Code:', signatureSVG);
    
    // Also log as an expandable object for better console interaction
    console.log('The Architect\'s Signature Object:', {
        message: 'A mark from The Architect.',
        signature: signatureSVG,
        timestamp: new Date().toISOString(),
        coordinates: {
            x: 'Hidden',
            y: 'Hidden',
            system: 'Trimark Industries'
        }
    });
}

// Method 3: Hidden Canvas Drawing
// Draw the signature onto a hidden canvas element
function drawSignatureOnCanvas() {
    const canvas = document.getElementById('hiddenCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 100;
    canvas.height = 100;
    
    // Clear canvas
    ctx.clearRect(0, 0, 100, 100);
    
    // Draw the fragmented shell (hexagon outline)
    ctx.strokeStyle = '#D119C6';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    
    // Hexagon path
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.lineTo(86.6025, 25);
    ctx.lineTo(86.6025, 75);
    ctx.lineTo(50, 100);
    ctx.lineTo(13.3975, 75);
    ctx.lineTo(13.3975, 25);
    ctx.closePath();
    ctx.stroke();
    
    // Vertical line
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.lineTo(50, 100);
    ctx.stroke();
    
    // Diagonal lines
    ctx.beginPath();
    ctx.moveTo(13.3975, 75);
    ctx.lineTo(86.6025, 25);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(13.3975, 25);
    ctx.lineTo(86.6025, 75);
    ctx.stroke();
    
    // Draw the perfect core (diamond)
    ctx.fillStyle = '#D119C6';
    ctx.beginPath();
    ctx.moveTo(50, 20);
    ctx.lineTo(80, 50);
    ctx.lineTo(50, 80);
    ctx.lineTo(20, 50);
    ctx.closePath();
    ctx.fill();
    
    // Center circle
    ctx.fillStyle = '#0A0A0A';
    ctx.beginPath();
    ctx.arc(50, 50, 3, 0, 2 * Math.PI);
    ctx.fill();
}

// Expose wallet functions globally for use across pages
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.initializeWalletDetection = initializeWalletDetection;
window.detectWalletType = detectWalletType;
window.initializeApp = initializeApp;
window.setupEventListeners = setupEventListeners;
window.updateUserProfile = updateUserProfile;
window.loadApprovedUsers = loadApprovedUsers;
window.checkAdminStatus = checkAdminStatus;


// Initialize The Architect's Signature when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Method 1: Inject console signature immediately
    injectConsoleSignature();
    
    // Method 3: Draw signature on hidden canvas
    drawSignatureOnCanvas();
    
    // Set up periodic console signature injection (every 30 seconds)
    // This ensures the signature is available even if console is opened later
    setInterval(injectConsoleSignature, 30000);
    
    // Additional console detection (optional enhancement)
    // This will re-inject the signature if the console is opened
    let consoleOpen = false;
    const checkConsole = () => {
        if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
            if (!consoleOpen) {
                consoleOpen = true;
                setTimeout(injectConsoleSignature, 100);
            }
        } else {
            consoleOpen = false;
        }
    };
    
    // Check for console every 2 seconds
    setInterval(checkConsole, 2000);
});

// WALLET GATE SYSTEM - Mandatory wallet connection before accessing site content

// Show wallet gate overlay that blocks all content
function showWalletGate() {
    console.log('🔒 Showing wallet gate - blocking all site content');
    
    // Hide all main content immediately
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.style.display = 'none';
    }
    
    // Remove any existing wallet gate
    const existingGate = document.getElementById('walletGate');
    if (existingGate) {
        existingGate.remove();
    }
    
    // Create wallet gate overlay
    const walletGate = document.createElement('div');
    walletGate.id = 'walletGate';
    walletGate.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Orbitron', monospace;
    `;
    
    walletGate.innerHTML = `
        <div style="
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(20px);
            border: 2px solid #00d4ff;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 0 50px rgba(0, 212, 255, 0.3);
        ">
            <div style="margin-bottom: 30px;">
                <img src="ChatGPT_Image_Jul_3_2025_08_34_57_PM.png" alt="Trimark Industries Logo" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #00d4ff;">
            </div>
            <h1 style="color: #00d4ff; font-size: 2.5rem; margin-bottom: 20px; text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);">🔒 WALLET REQUIRED</h1>
            <p style="color: #ffffff; font-size: 1.2rem; margin-bottom: 30px; font-family: 'Exo 2', sans-serif;">You must connect your wallet to access Trimark Industries</p>
            <div style="margin-bottom: 30px;">
                <div id="walletDetectionStatus" style="
                    color: #00d4ff;
                    font-size: 1.1rem;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: rgba(0, 212, 255, 0.1);
                    border-radius: 10px;
                    border: 1px solid rgba(0, 212, 255, 0.3);
                ">🔍 Detecting available wallets...</div>
                <button id="connectWalletBtn" style="
                    background: linear-gradient(135deg, #00d4ff, #ff6b6b);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 25px;
                    font-size: 1.2rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 0 auto;
                " disabled>
                    <span>🔗</span>
                    Connect Wallet
                </button>
            </div>
            <div style="
                text-align: left;
                background: rgba(255, 255, 255, 0.05);
                padding: 20px;
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            ">
                <p style="color: #00d4ff; font-weight: 600; margin-bottom: 15px; font-size: 1rem;"><strong>Supported Wallets:</strong></p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="color: #ffffff; padding: 8px 0; font-size: 0.95rem; font-family: 'Exo 2', sans-serif;">✅ MetaMask</li>
                    <li style="color: #ffffff; padding: 8px 0; font-size: 0.95rem; font-family: 'Exo 2', sans-serif;">✅ OneKey</li>
                    <li style="color: #ffffff; padding: 8px 0; font-size: 0.95rem; font-family: 'Exo 2', sans-serif;">✅ Other EIP-6963 compatible wallets</li>
                </ul>
            </div>
        </div>
    `;
    
    document.body.appendChild(walletGate);
    
    // Set up wallet gate event listeners
    setupWalletGateListeners();
}

// Auto-connect wallet on page load
async function autoConnectWallet() {
    console.log('🚀 Auto-connecting wallet on page load...');
    
    try {
        // Wait a moment for wallet detection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to detect and connect wallet automatically
        const detectedWallet = await detectWalletType();
        console.log('🔍 Auto-detected wallet type:', detectedWallet);
        
        if (detectedWallet !== 'none') {
            console.log('✅ Wallet detected, attempting auto-connection...');
            await connectWallet();
        } else {
            console.log('❌ No wallet detected, showing manual connection option');
            updateWalletGateStatus('No wallet detected. Please install MetaMask or OneKey.', 'error');
            enableConnectButton();
        }
        
    } catch (error) {
        console.error('❌ Auto-connection failed:', error);
        updateWalletGateStatus('Auto-connection failed. Please connect manually.', 'error');
        enableConnectButton();
    }
}

// Update wallet gate status
function updateWalletGateStatus(message, type = 'info') {
    const statusElement = document.getElementById('walletDetectionStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `wallet-status-${type}`;
    }
}

// Enable connect button
function enableConnectButton() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Wallet';
    }
}

// Setup wallet gate event listeners
function setupWalletGateListeners() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            try {
                updateWalletGateStatus('🔌 Connecting to wallet...', 'info');
                connectBtn.disabled = true;
                connectBtn.textContent = 'Connecting...';
                
                await connectWallet();
                
            } catch (error) {
                console.error('❌ Manual connection failed:', error);
                updateWalletGateStatus(`Connection failed: ${error.message}`, 'error');
                enableConnectButton();
            }
        });
    }
}

// Hide wallet gate and show site content
function hideWalletGate() {
    console.log('✅ Hiding wallet gate - showing site content');
    
    const walletGate = document.getElementById('walletGate');
    if (walletGate) {
        walletGate.style.display = 'none';
    }
    
    // Show main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    const footer = document.querySelector('.footer');
    if (footer) {
        footer.style.display = 'block';
    }
}
