import { keccak256, toHex } from "viem";

/**
 * Generate a random number using keccak256 hash
 * @param seed - Optional seed for deterministic randomness
 * @returns A random BigInt
 */
export function generateRandomNumber(seed?: string): bigint {
  const timestamp = Date.now().toString();
  const randomData = Math.random().toString();
  const inputData = seed
    ? `${seed}-${timestamp}-${randomData}`
    : `${timestamp}-${randomData}`;

  const hash = keccak256(toHex(inputData));
  return BigInt(hash);
}

/**
 * Check if user wins based on random number and difficulty
 * @param winDifficulty - The win difficulty from the smart contract
 * @param seed - Optional seed for deterministic randomness
 * @returns true if user wins (random % difficulty === 0)
 */
export function checkWin(winDifficulty: bigint, seed?: string): boolean {
  if (winDifficulty === BigInt(0)) return false;

  const randomNum = generateRandomNumber(seed);
  const result = randomNum % winDifficulty;

  console.log("Random number:", randomNum.toString());
  console.log("Win difficulty:", winDifficulty.toString());
  console.log("Modulo result:", result.toString());
  console.log("Win:", result === BigInt(0));

  return result === BigInt(0);
}
