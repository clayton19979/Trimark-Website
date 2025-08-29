# Trimark Industries - EVE Frontier Website

A modern, space-themed website for Trimark Industries, a corporation in the EVE Frontier game universe. Features Web3 wallet integration and real-time EVE Frontier character data.

## 🌟 Features

### Space Theme & Design
- **Animated Star Background**: Dynamic twinkling stars with parallax effects
- **Modern UI**: Clean, professional design with space aesthetics
- **Responsive Layout**: Optimized for all device sizes
- **Interactive Elements**: Hover effects, animations, and smooth transitions

### Web3 Integration
- **MetaMask Support**: Connect your Ethereum wallet
- **Automatic Detection**: Checks for installed wallets
- **Account Management**: Handle wallet connections and disconnections
- **Event Handling**: Responds to account and network changes

### EVE Frontier Integration
- **Character Data**: Fetches real-time character information
- **Profile Pictures**: Displays character portraits from the game
- **Character Names**: Shows in-game character names
- **API Integration**: Connects to EVE Frontier's official API

### Website Sections
- **Hero Section**: Welcome message with animated space station
- **About Section**: Company information and capabilities
- **Services Section**: Offered services and specializations
- **Contact Section**: Contact form with wallet verification

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- MetaMask or another Web3 wallet extension
- An EVE Frontier account (optional, for full functionality)

### Installation
1. Clone or download the project files
2. Ensure all files are in the same directory:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `ChatGPT_Image_Jul_3_2025_08_34_57_PM.png` (reference image)

### Running the Website
1. Open `index.html` in your web browser
2. The website will load with the space theme and animations
3. Click "Connect Wallet" to integrate with MetaMask
4. Once connected, your EVE Frontier character data will be displayed

## 🔧 Technical Details

### Technologies Used
- **HTML5**: Semantic markup and structure
- **CSS3**: Advanced styling with animations and responsive design
- **JavaScript (ES6+)**: Modern JavaScript with async/await
- **Ethers.js**: Web3 library for Ethereum integration
- **EVE Frontier API**: Official game API for character data

### API Endpoints
The website integrates with the EVE Frontier API:
```
GET https://world-api-stillness.live.tech.evefrontier.com/v2/smartcharacters/{address}?format=json
```

### Data Retrieved
- Character name (`name`)
- Character portrait (`portraitUrl`)
- Wallet address (`address`)
- Game balances and assets
- Smart assembly information

## 🎨 Customization

### Colors
The website uses a space-themed color palette:
- Primary: `#00d4ff` (Cyan)
- Secondary: `#ff6b6b` (Coral)
- Background: `#0a0a0a` (Dark)
- Text: `#ffffff` (White)

### Fonts
- **Orbitron**: Used for headings and logo (space theme)
- **Exo 2**: Used for body text (modern, readable)

### Animations
- Floating animations for hero elements
- Rotating space station rings
- Twinkling star background
- Scroll-triggered animations
- Hover effects on interactive elements

## 📱 Responsive Design

The website is fully responsive and optimized for:
- **Desktop**: Full layout with side-by-side sections
- **Tablet**: Adjusted grid layouts
- **Mobile**: Stacked layout with mobile-optimized navigation

## 🔐 Security Features

- **Wallet Verification**: Contact form requires wallet connection
- **Data Validation**: Input validation and error handling
- **Secure API Calls**: Proper headers and error handling
- **Local Storage**: User data stored locally for performance

## 🐛 Troubleshooting

### Common Issues

**Wallet Not Connecting**
- Ensure MetaMask is installed and unlocked
- Check if you're on the correct network
- Try refreshing the page

**Character Data Not Loading**
- Verify your wallet address has an EVE Frontier character
- Check browser console for API errors
- Ensure you're connected to the internet

**Animations Not Working**
- Check if JavaScript is enabled
- Try refreshing the page
- Ensure you're using a modern browser

### Browser Compatibility
- **Chrome**: 80+ (Recommended)
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

## 🚀 Future Enhancements

Potential features for future versions:
- **Real-time Updates**: Live character data updates
- **Corporation Management**: In-game corporation features
- **Market Integration**: EVE Frontier market data
- **Social Features**: Player interaction and messaging
- **Mobile App**: Native mobile application

## 📄 License

This project is created for Trimark Industries and EVE Frontier. All rights reserved.

## 🤝 Support

For technical support or questions about the website:
- Check the browser console for error messages
- Ensure all files are properly loaded
- Verify wallet and API connectivity

---

**Welcome to Trimark Industries - Forging the Future in EVE Frontier** 🚀
