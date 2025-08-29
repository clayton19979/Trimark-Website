// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Trinium (TRIN)
 * @dev A simple ERC20 token with transaction taxes
 * 
 * Features:
 * - Fixed supply (no minting or burning)
 * - Transaction taxes on transfers
 * - Simple transfer functionality
 */
contract TMC is ERC20, Ownable {
    // Tax addresses
    address public constant TAX_WALLET_1 = 0xD6e3a99f7D98B942B027D698391A76C959F5d721;
    address public constant TAX_WALLET_2 = 0xD9A41d42240a7a2cf7F24138Abb4A368759cd58a;
    
    // Tax rates (in basis points - 100 = 1%)
    uint256 public constant TAX_RATE_1 = 100; // 1%
    uint256 public constant TAX_RATE_2 = 1; // 0.01%
    
    // Total tax rate
    uint256 public constant TOTAL_TAX_RATE = TAX_RATE_1 + TAX_RATE_2; // 1.01%
    
    // Events
    event TaxesCollected(uint256 tax1Amount, uint256 tax2Amount, uint256 netAmount);
    
    constructor() ERC20("Trinium", "TRIN") Ownable(msg.sender) {
        // Mint initial supply to TAX_WALLET_1
        _mint(TAX_WALLET_1, 100000000 * 10**18); // 100 million TRIN
    }
    
    /**
     * @dev Override transfer function to apply taxes
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate taxes
        uint256 tax1Amount = (amount * TAX_RATE_1) / 10000; // 1% to wallet 1
        uint256 tax2Amount = (amount * TAX_RATE_2) / 10000; // 0.01% to wallet 2
        uint256 netAmount = amount - tax1Amount - tax2Amount;
        
        // Transfer taxes to wallet 1
        if (tax1Amount > 0) {
            super.transfer(TAX_WALLET_1, tax1Amount);
        }
        
        // Transfer taxes to wallet 2
        if (tax2Amount > 0) {
            super.transfer(TAX_WALLET_2, tax2Amount);
        }
        
        // Transfer net amount to recipient
        super.transfer(to, netAmount);
        
        emit TaxesCollected(tax1Amount, tax2Amount, netAmount);
        
        return true;
    }
    
    /**
     * @dev Override transferFrom function to apply taxes
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate taxes
        uint256 tax1Amount = (amount * TAX_RATE_1) / 10000; // 1% to wallet 1
        uint256 tax2Amount = (amount * TAX_RATE_2) / 10000; // 0.01% to wallet 2
        uint256 netAmount = amount - tax1Amount - tax2Amount;
        
        // Transfer taxes to wallet 1
        if (tax1Amount > 0) {
            super.transferFrom(from, TAX_WALLET_1, tax1Amount);
        }
        
        // Transfer taxes to wallet 2
        if (tax2Amount > 0) {
            super.transferFrom(from, TAX_WALLET_2, tax2Amount);
        }
        
        // Transfer net amount to recipient
        super.transferFrom(from, to, netAmount);
        
        emit TaxesCollected(tax1Amount, tax2Amount, netAmount);
        
        return true;
    }
    
    /**
     * @dev Get tax information for a given amount
     */
    function getTaxInfo(uint256 amount) public pure returns (
        uint256 tax1Amount,
        uint256 tax2Amount,
        uint256 netAmount,
        uint256 totalTax
    ) {
        tax1Amount = (amount * TAX_RATE_1) / 10000;
        tax2Amount = (amount * TAX_RATE_2) / 10000;
        totalTax = tax1Amount + tax2Amount;
        netAmount = amount - totalTax;
    }
    
    /**
     * @dev Get total tax rate in basis points
     */
    function getTotalTaxRate() public pure returns (uint256) {
        return TOTAL_TAX_RATE;
    }
}
