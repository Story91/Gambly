const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting GamblyTest token deployment...");

  // Check if PRIVATE_KEY is set
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in .env file!");
  }

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("❌ Deployer account has no ETH balance!");
  }

  // Estimate gas price for Base networks
  let gasPrice;
  if (network.chainId === 8453n) {
    // Base mainnet - use higher gas price to replace stuck transaction
    gasPrice = ethers.parseUnits("0.1", "gwei");
    console.log(`⛽ Using Base mainnet gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  } else if (network.chainId === 84532n) {
    // Base sepolia - lower gas price is fine
    gasPrice = ethers.parseUnits("0.01", "gwei");
    console.log(`⛽ Using Base sepolia gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
  }

  // Deploy GamblyTest token
  console.log("\n📦 Deploying GamblyTest token...");
  
  const GamblyTestFactory = await ethers.getContractFactory("GamblyTest");
  
  const deploymentOptions: any = {
    gasLimit: 2500000, // Increased gas limit
    nonce: await ethers.provider.getTransactionCount(deployer.address, "pending"), // Explicit nonce
  };
  
  if (gasPrice) {
    deploymentOptions.gasPrice = gasPrice;
  }
  
  console.log(`⚙️  Using nonce: ${deploymentOptions.nonce}`);
  
  const gamblyTest = await GamblyTestFactory.deploy(deployer.address, deploymentOptions);
  
  // Wait for deployment
  console.log("⏳ Waiting for deployment confirmation...");
  await gamblyTest.waitForDeployment();
  const contractAddress = await gamblyTest.getAddress();

  console.log(`✅ GamblyTest deployed to: ${contractAddress}`);
  console.log(`🏠 Owner address: ${deployer.address}`);

  // Wait for a few block confirmations on mainnet
  if (network.chainId === 8453n) {
    console.log("⏳ Waiting for block confirmations on Base mainnet...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
  }

  // Verify token details
  try {
    console.log("\n📊 Token Information:");
    const tokenInfo = await gamblyTest.getTokenInfo();
    console.log(`   Name: ${tokenInfo.tokenName}`);
    console.log(`   Symbol: ${tokenInfo.tokenSymbol}`);
    console.log(`   Decimals: ${tokenInfo.tokenDecimals}`);
    console.log(`   Current Supply: ${ethers.formatEther(tokenInfo.currentSupply)} TEST`);
    console.log(`   Max Supply: ${ethers.formatEther(tokenInfo.maxSupply)} TEST`);

    // Check deployer's token balance
    const deployerBalance = await gamblyTest.balanceOf(deployer.address);
    console.log(`   Deployer Balance: ${ethers.formatEther(deployerBalance)} TEST`);
  } catch (error) {
    console.log("⚠️  Could not fetch token info immediately, contract may still be propagating");
  }

  // Save deployment info
  const deploymentInfo = {
    network: {
      name: network.name,
      chainId: network.chainId.toString()
    },
    contractAddress: contractAddress,
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: new Date().toISOString(),
    gasUsed: deploymentOptions.gasLimit,
    gasPrice: gasPrice ? ethers.formatUnits(gasPrice, "gwei") : "default"
  };

  console.log("\n💾 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Network-specific instructions
  if (network.chainId === 8453n) {
    console.log("\n🔍 Verify on BaseScan:");
    console.log(`https://basescan.org/address/${contractAddress}`);
    console.log("\n📝 To verify contract:");
    console.log(`npx hardhat verify --network base ${contractAddress} "${deployer.address}"`);
  } else if (network.chainId === 84532n) {
    console.log("\n🔍 View on Base Sepolia:");
    console.log(`https://sepolia.basescan.org/address/${contractAddress}`);
    console.log("\n📝 To verify contract:");
    console.log(`npx hardhat verify --network base-sepolia ${contractAddress} "${deployer.address}"`);
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log(`💼 Contract Address: ${contractAddress}`);
  
  return {
    contract: gamblyTest,
    address: contractAddress,
    deployer: deployer.address,
    network: network.name
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  }); 