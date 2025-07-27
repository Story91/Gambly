import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACTS, GAMBLING_CONTRACT_ABI } from "../../../lib/contracts";

// Create a public client for reading contract data
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Create a wallet client for sending transactions as the contract owner
const createOwnerWalletClient = () => {
  console.log("Checking for PRIVATE_KEY...");
  const privateKey = process.env.PRIVATE_KEY;
  console.log("PRIVATE_KEY exists:", !!privateKey);
  console.log("PRIVATE_KEY length:", privateKey?.length);
  
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log("Account created:", account.address);
  
  return createWalletClient({
    account,
    chain: base,
    transport: http(),
  });
};

export async function POST(request: NextRequest) {
  try {
    console.log("API route called");
    
    const body = await request.json();
    console.log("Request body:", body);
    
    const { recipient } = body;
    
    if (!recipient) {
      console.error("No recipient provided");
      return NextResponse.json(
        { error: "Recipient address is required" },
        { status: 400 },
      );
    }

    console.log("Creating wallet client...");
    const walletClient = createOwnerWalletClient();
    console.log("Wallet client created with account:", walletClient.account.address);

    console.log("Simulating contract call...");
    const { request: contractRequest } = await publicClient.simulateContract({
      account: walletClient.account,
      address: CONTRACTS.GAMBLING_ADDRESS,
      abi: GAMBLING_CONTRACT_ABI,
      functionName: "gamblyWin",
      args: [recipient],
    });

    console.log("Contract simulation successful, sending transaction...");
    const hash = await walletClient.writeContract(contractRequest);
    console.log("Transaction sent, hash:", hash);
    
    // Wait for transaction to be mined
    console.log("Waiting for transaction receipt...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction mined, receipt:", receipt.transactionHash);
    
    return NextResponse.json({
      success: true,
      transactionHash: receipt.transactionHash,
    });
  } catch (error) {
    console.error("Error calling gamblyWin as owner:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to call gamblyWin as contract owner" },
      { status: 500 },
    );
  }
}
