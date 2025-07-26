// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GamblyTest
 * @dev ERC20 token contract for GamblyTest (TEST)
 * Features:
 * - Standard ERC20 functionality
 * - Burnable tokens
 * - Owner-controlled minting
 * - Initial supply of 1,000,000 TEST tokens
 */
contract GamblyTest is ERC20, ERC20Burnable, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**18; // 1 million tokens
    uint256 public constant MAX_SUPPLY = 10_000_000 * 10**18; // 10 million tokens max

    /**
     * @dev Constructor that mints initial supply to the deployer
     * @param initialOwner Address that will become the owner of the contract
     */
    constructor(address initialOwner) 
        ERC20("GamblyTest", "TEST") 
        Ownable(initialOwner)
    {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "GamblyTest: Max supply exceeded");
        _mint(to, amount);
    }

    /**
     * @dev Batch mint tokens to multiple addresses (only owner)
     * @param recipients Array of addresses to mint tokens to
     * @param amounts Array of amounts to mint to each recipient
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "GamblyTest: Arrays length mismatch");
        
        uint256 totalMintAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalMintAmount += amounts[i];
        }
        
        require(totalSupply() + totalMintAmount <= MAX_SUPPLY, "GamblyTest: Max supply exceeded");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Get token information
     * @return tokenName Token name
     * @return tokenSymbol Token symbol
     * @return tokenDecimals Number of decimals
     * @return currentSupply Current total supply
     * @return maxSupply Maximum possible supply
     */
    function getTokenInfo() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 currentSupply,
        uint256 maxSupply
    ) {
        return (
            "GamblyTest",
            "TEST",
            18,
            totalSupply(),
            MAX_SUPPLY
        );
    }
} 