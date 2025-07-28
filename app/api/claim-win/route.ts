import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACTS, GAMBLING_CONTRACT_ABI } from "../../../lib/contracts";

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

    console.log("Attempting to claim win for recipient...");
    const claimResult = await attemptClaim(recipient);

    if (claimResult.success) {
      return NextResponse.json({
        success: true,
        transactionHash: claimResult.transactionHash,
      });
    } else {
      console.error("Failed to claim win:", claimResult.error);
      return NextResponse.json(
        { error: claimResult.error },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error calling gamblyWin as owner:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to call gamblyWin as contract owner" },
      { status: 500 },
    );
  }
}

async function attemptClaim(recipient: `0x${string}`, retries = 3, delay = 2000): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      const walletClient = createOwnerWalletClient();
      const publicClient = createPublicClient({ chain: base, transport: http() });

      console.log(`Attempt ${i + 1} to claim win for ${recipient}`);

      const { request: contractRequest } = await publicClient.simulateContract({
        account: walletClient.account,
        address: CONTRACTS.GAMBLING_ADDRESS,
        abi: GAMBLING_CONTRACT_ABI,
        functionName: 'gamblyWin',
        args: [recipient],
      });

      const hash = await walletClient.writeContract(contractRequest);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        console.log(`Attempt ${i + 1} successful. TX hash: ${hash}`);
        return { success: true, transactionHash: receipt.transactionHash };
      } else {
        console.warn(`Attempt ${i + 1} failed. TX reverted. Hash: ${hash}`);
        // Fall through to retry
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} threw an error:`, error);
      if (i === retries - 1) { // Last attempt
        return { success: false, error: error instanceof Error ? error.message : "Unknown error during claim" };
      }
      await new Promise(res => setTimeout(res, delay * (i + 1))); // Exponential backoff
    }
  }
  return { success: false, error: "All claim attempts failed." };
}
