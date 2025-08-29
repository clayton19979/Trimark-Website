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
    '0xd9a41d42240a7a2cf7f24138abb4a368759cd58a'
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
        
        // Show initial connect wallet message
        showInitialConnectMessage();
        
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
    }, 500);
});

// Initialize the application
function initializeApp() {
    console.log('Initializing app with MetaMask detection...');
    
    // Check if ethers is available
    if (typeof ethers === 'undefined') {
        console.log('❌ Ethers library not loaded, retrying...');
        setTimeout(initializeApp, 1000);
        return;
    }
    
    console.log('✅ Ethers library loaded successfully');
    
    // Initialize admin system
    loadApprovedUsers();
    
    // Check if MetaMask is available
    if (typeof window.ethereum !== 'undefined') {
        console.log('✅ MetaMask detected!');
        walletType = 'metamask';
        
        // Check if already connected
        checkExistingConnection();
    } else {
        console.log('❌ No wallet detected');
        walletType = 'none';
        
        if (connectWalletBtn) {
            connectWalletBtn.textContent = 'Install MetaMask';
            connectWalletBtn.disabled = true;
        }
    }
}

// Check if wallet is already connected
async function checkExistingConnection() {
    try {
        if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                console.log('✅ Found existing wallet connection:', accounts[0]);
                currentAccount = accounts[0];
                isConnected = true;
                
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
        console.error('Error checking existing connection:', error);
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
    
    // Admin panel button
    const adminPanelBtn = document.getElementById('adminPanelBtn');
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', openAdminPanel);
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
    
    // Form submission
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
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
}

// Connect wallet function using MetaMask
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

        // Check if MetaMask is available
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Please install MetaMask or another Web3 wallet!');
        }

        console.log('🔌 MetaMask detected, requesting accounts...');

        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length === 0) {
            throw new Error('No accounts found!');
        }

        console.log('✅ Accounts received:', accounts);

        // Create ethers provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Get network info
        const network = await provider.getNetwork();
        chainId = network.chainId;

        // Set state
        currentAccount = accounts[0];
        isConnected = true;

        console.log('✅ Wallet connected successfully:', currentAccount);
        console.log('🔗 Network chain ID:', chainId);

        // Update UI
        await updateUserProfile();
        
        // Load approved users first, then check admin status
        loadApprovedUsers();
        checkAdminStatus();
        
        // Set up wallet event listeners
        setupWalletListeners();

        // Show success message
        alert('Wallet connected successfully! Account: ' + currentAccount.slice(0, 6) + '...' + currentAccount.slice(-4));

    } catch (err) {
        error = err.message;
        console.error('❌ Error connecting wallet:', err);
        alert('Failed to connect wallet: ' + err.message);
    } finally {
        isConnecting = false;
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.disabled = false;
    }
}

// Set up wallet event listeners
function setupWalletListeners() {
    if (typeof window.ethereum !== 'undefined') {
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log('🔌 Accounts changed:', accounts);
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
            console.log('🔗 Chain changed:', newChainId);
            chainId = parseInt(newChainId, 16);
            window.location.reload(); // Reload to ensure clean state
        });

        // Listen for disconnect
        window.ethereum.on('disconnect', () => {
            console.log('🔌 Wallet disconnected');
            disconnectWallet();
        });
    }
}



// Handle account changes
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
            userAddress.textContent = `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
            
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
            
            // Remove initial connect message if it exists
            const initialMessage = document.getElementById('initialConnectMessage');
            if (initialMessage) {
                initialMessage.remove();
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

// Show initial connect wallet message
function showInitialConnectMessage() {
    // Remove any existing initial message
    const existingMessage = document.getElementById('initialConnectMessage');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create initial message
    const messageDiv = document.createElement('div');
    messageDiv.id = 'initialConnectMessage';
    messageDiv.className = 'initial-connect-message';
    messageDiv.innerHTML = `
        <div class="initial-connect-content">
            <h3>🔐 Welcome to Trimark Industries</h3>
            <p>This site is restricted to members of <strong>Trimark Industries</strong></p>
            <p>Please connect your wallet to verify your tribe membership and access the site.</p>
            <div class="discord-help-section">
                <p>💬 Need help joining the tribe?</p>
                <a href="https://discord.gg/7ym36qS9" target="_blank" class="discord-invite-btn">
                    <span class="discord-icon">📱</span>
                    Join Our Discord
                </a>
                <p class="discord-help-text">Join our Discord server to get help getting approved in-game!</p>
            </div>
        </div>
    `;
    
    // Insert message after the header
    const header = document.querySelector('.header');
    if (header) {
        header.parentNode.insertBefore(messageDiv, header.nextSibling);
    }
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
    userAddress.textContent = '';
    
    // Re-enable and reset button
    connectWalletBtn.disabled = false;
    connectWalletBtn.textContent = 'Connect Wallet';
    
    // Hide admin button
    hideAdminButton();
    
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



// Handle contact form submission
function handleContactForm(e) {
    e.preventDefault();
    
    const messageTextarea = document.getElementById('message');
    const message = messageTextarea.value.trim();
    
    if (!message) {
        alert('Please enter a message before submitting.');
        return;
    }
    
    if (!currentAccount) {
        alert('Please connect your wallet to send a message.');
        return;
    }
    
    // Simulate form submission
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    // Simulate API call delay
    setTimeout(() => {
        alert('Thank you for your message! We will get back to you soon.');
        messageTextarea.value = '';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }, 2000);
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
    // First check if user has tribe access
    const userData = JSON.parse(localStorage.getItem('trimark_user_data') || '{}');
    if (!hasRequiredTribeAccess(userData)) {
        isAdmin = false;
        hideAdminButton();
        console.log('❌ User does not have tribe access');
        return;
    }
    
    // Then check admin status
    if (currentAccount && (ADMIN_WALLETS.includes(currentAccount.toLowerCase()) || approvedUsers.includes(currentAccount.toLowerCase()))) {
        isAdmin = true;
        showAdminButton();
        console.log('✅ User is admin or approved');
    } else {
        isAdmin = false;
        hideAdminButton();
        console.log('❌ User is not admin or approved');
    }
}

function showAdminButton() {
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn) {
        adminBtn.style.display = 'flex';
    }
}

function hideAdminButton() {
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn) {
        adminBtn.style.display = 'none';
    }
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
        
        return `
            <div class="user-item" data-address="${user}">
                <div class="user-info">
                    <div class="user-address">${user}</div>
                    <span class="user-status ${statusClass}">${statusText}</span>
                </div>
                <div class="user-actions">
                    ${!isAdminUser ? `
                        <button class="user-action-btn remove" onclick="removeApprovedUser('${user}')">
                            Remove
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

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
}

// Export functions for potential external use
window.TrimarkApp = {
    connectWallet,
    disconnectWallet,
    fetchEveFrontierData,
    formatEveBalance,
    formatGasBalance,
    isUserApproved,
    isAdmin
};
