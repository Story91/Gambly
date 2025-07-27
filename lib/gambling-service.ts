import { encodeFunctionData, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { CONTRACTS, GAMBLING_CONTRACT_ABI } from "./contracts";

// Create a public client for reading contract data
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Read WIN_DIFFICULTY from the gambling contract
 * @returns Promise<bigint> - The current win difficulty
 */
export async function getWinDifficulty(): Promise<bigint> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.GAMBLING_ADDRESS,
      abi: GAMBLING_CONTRACT_ABI,
      functionName: "WIN_DIFFICULTY",
    });

    return result as bigint;
  } catch (error) {
    console.error("Error reading win difficulty:", error);
    throw new Error("Failed to read win difficulty from contract");
  }
}

/**
 * Create gamblyWin transaction data for OnchainKit Transaction component
 * @param recipient - Address to receive the win
 * @returns Transaction call object
 */
export function createGamblyWinCall(recipient: `0x${string}`) {
  return {
    to: CONTRACTS.GAMBLING_ADDRESS,
    data: encodeFunctionData({
      abi: GAMBLING_CONTRACT_ABI,
      functionName: "gamblyWin",
      args: [recipient],
    }) as `0x${string}`,
    value: BigInt(0),
  };
}

/**
 * Get the owner of the gambling contract
 * @returns Promise<string> - Owner address
 */
export async function getContractOwner(): Promise<string> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.GAMBLING_ADDRESS,
      abi: GAMBLING_CONTRACT_ABI,
      functionName: "owner",
    });

    return result as string;
  } catch (error) {
    console.error("Error reading contract owner:", error);
    throw new Error("Failed to read contract owner");
  }
}

/**
 * Call gamblyWin function as the contract owner via API
 * @param recipient - Address to receive the win
 * @returns Promise<string> - Transaction hash
 */
export async function callGamblyWinAsOwner(
  recipient: `0x${string}`,
): Promise<string> {
  try {
    console.log("Calling claim-win API with recipient:", recipient);

    const response = await fetch("/api/claim-win", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient }),
    });

    console.log("API response status:", response.status);
    console.log("API response ok:", response.ok);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      console.error("API error response:", errorData);
      throw new Error(
        errorData.error || `HTTP ${response.status}: Failed to claim win`,
      );
    }

    const data = await response.json();
    console.log("API success response:", data);
    return data.transactionHash;
  } catch (error) {
    console.error("Error calling gamblyWin as owner:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to call gamblyWin as contract owner");
  }
}
