import { encodeFunctionData } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, GAMBLING_CONTRACT_ABI } from './contracts';

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
      functionName: 'WIN_DIFFICULTY',
    });
    
    return result as bigint;
  } catch (error) {
    console.error('Error reading win difficulty:', error);
    throw new Error('Failed to read win difficulty from contract');
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
      functionName: 'gamblyWin',
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
      functionName: 'owner',
    });
    
    return result as string;
  } catch (error) {
    console.error('Error reading contract owner:', error);
    throw new Error('Failed to read contract owner');
  }
} 