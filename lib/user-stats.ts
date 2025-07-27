import { redis } from './redis';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Create client for ENS resolution
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

export interface UserStats {
  spins: number;
  wins: number;
  totalWon: string; // Store as string to preserve precision
  firstSeen: number;
  lastSeen: number;
}

export interface UserProfile {
  address: string;
  ensName?: string;
  baseName?: string;
  createdAt: number;
}

// Helper function to resolve ENS name
async function resolveEnsName(address: string): Promise<string | null> {
  try {
    const ensName = await mainnetClient.getEnsName({
      address: address as `0x${string}`
    });
    return ensName;
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    return null;
  }
}

// Helper function to resolve basename (simplified - would need Coinbase API in production)
async function resolveBasename(address: string): Promise<string | null> {
  try {
    // For now, we'll use a simple approach
    // In production, you'd use Coinbase's basename resolution API
    const response = await fetch(`https://resolver-api.coinbase.com/v1/name/${address}`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json() as { name?: string };
      return data.name || null;
    }
    return null;
  } catch (error) {
    console.error('Error resolving basename:', error);
    return null;
  }
}

// Main function to resolve any name (ENS or basename) with caching
async function resolveDisplayName(address: string): Promise<string | undefined> {
  if (!redis || !address) return undefined;

  try {
    // Check cache first
    const cacheKey = `name:${address}`;
    const cached = await redis.get(cacheKey) as string | null;
    if (cached) {
      return cached === 'null' ? undefined : cached;
    }

    // Try ENS first
    let displayName = await resolveEnsName(address);
    
    // If no ENS, try basename
    if (!displayName) {
      displayName = await resolveBasename(address);
    }

    // Cache result for 1 hour
    await redis.setex(cacheKey, 3600, displayName ?? 'null');
    
    return displayName ?? undefined;
  } catch (error) {
    console.error('Error resolving display name:', error);
    return undefined;
  }
}

export async function getUserStats(address: string): Promise<UserStats> {
  if (!redis || !address) {
    return { spins: 0, wins: 0, totalWon: "0", firstSeen: 0, lastSeen: 0 };
  }

  try {
    const statsData = await redis.hgetall(`user:${address}:stats`);
    const stats = statsData || {};
    
    return {
      spins: parseInt((stats.spins as string) || "0"),
      wins: parseInt((stats.wins as string) || "0"),
      totalWon: (stats.totalWon as string) || "0",
      firstSeen: parseInt((stats.firstSeen as string) || "0"),
      lastSeen: parseInt((stats.lastSeen as string) || "0"),
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return { spins: 0, wins: 0, totalWon: "0", firstSeen: 0, lastSeen: 0 };
  }
}

export async function updateUserStats(
  address: string, 
  isWin: boolean, 
  tokensWon: string = "0"
): Promise<void> {
  if (!redis || !address) return;

  try {
    const now = Date.now();
    const key = `user:${address}:stats`;
    
    // Get current stats or create new
    const currentStats = await getUserStats(address);
    
    // Calculate new stats
    const newSpins = currentStats.spins + 1;
    const newWins = isWin ? currentStats.wins + 1 : currentStats.wins;
    const currentTotalWon = parseFloat(currentStats.totalWon || "0");
    const additionalWon = parseFloat(tokensWon || "0");
    const newTotalWon = (currentTotalWon + additionalWon).toString();
    
    // Update Redis
    await redis.hset(key, {
      spins: newSpins.toString(),
      wins: newWins.toString(),
      totalWon: newTotalWon,
      firstSeen: currentStats.firstSeen || now.toString(),
      lastSeen: now.toString(),
    });

    // Update leaderboards
    await updateLeaderboards(address, newWins, newSpins, parseFloat(newTotalWon));
    
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
}

export async function createUserAccount(address: string): Promise<void> {
  if (!redis || !address) return;

  try {
    const profileKey = `user:${address}:profile`;
    const exists = await redis.exists(profileKey);
    
    if (!exists) {
      const now = Date.now();
      await redis.hset(profileKey, {
        address,
        createdAt: now.toString(),
      });
      
      // Initialize stats if they don't exist
      const statsKey = `user:${address}:stats`;
      const statsExists = await redis.exists(statsKey);
      if (!statsExists) {
        await redis.hset(statsKey, {
          spins: "0",
          wins: "0", 
          totalWon: "0",
          firstSeen: now.toString(),
          lastSeen: now.toString(),
        });
      }
    }
  } catch (error) {
    console.error("Error creating user account:", error);
  }
}

async function updateLeaderboards(
  address: string, 
  wins: number, 
  spins: number, 
  totalWon: number
): Promise<void> {
  if (!redis) return;

  try {
    // Update total won leaderboard
    await redis.zadd("leaderboard:total_won", { score: totalWon, member: address });
    
    // Update win ratio leaderboard (only if user has spins)
    if (spins > 0) {
      const winRatio = (wins / spins) * 100;
      await redis.zadd("leaderboard:win_ratio", { score: winRatio, member: address });
    }
  } catch (error) {
    console.error("Error updating leaderboards:", error);
  }
}

export async function getGlobalStats() {
  if (!redis) {
    return { totalGames: 0, totalWins: 0, totalPlayers: 0 };
  }

  try {
    const statsData = await redis.hgetall("global:stats");
    const stats = statsData || {};
    return {
      totalGames: parseInt((stats.totalGames as string) || "0"),
      totalWins: parseInt((stats.totalWins as string) || "0"), 
      totalPlayers: parseInt((stats.totalPlayers as string) || "0"),
    };
  } catch (error) {
    console.error("Error getting global stats:", error);
    return { totalGames: 0, totalWins: 0, totalPlayers: 0 };
  }
}

export async function incrementGlobalStats(isWin: boolean): Promise<void> {
  if (!redis) return;

  try {
    await redis.hincrby("global:stats", "totalGames", 1);
    if (isWin) {
      await redis.hincrby("global:stats", "totalWins", 1);
    }
  } catch (error) {
    console.error("Error incrementing global stats:", error);
  }
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string; // ENS or basename if available
  totalWon: string;
  spins: number;
  wins: number;
  winRatio: string;
}

export async function getLeaderboard(type: 'total_won' | 'win_ratio' = 'total_won', limit: number = 10): Promise<LeaderboardEntry[]> {
  if (!redis) return [];

  try {
    const leaderboardKey = `leaderboard:${type}`;
    
    // Get top players from sorted set (descending order using zrange with REV)
    const topPlayers = await redis.zrange(leaderboardKey, 0, limit - 1, { 
      rev: true, 
      withScores: true 
    });
    
    if (!topPlayers || topPlayers.length === 0) {
      return [];
    }

    const leaderboard: LeaderboardEntry[] = [];
    
    // Process players in pairs (member, score)
    for (let i = 0; i < topPlayers.length; i += 2) {
      const address = topPlayers[i] as string;
      const score = topPlayers[i + 1] as number;
      
      if (!address) continue;
      
      // Get detailed stats for this user to get additional info
      const userStats = await getUserStats(address);
      
             // Resolve display name (ENS or basename)
       const displayName = await resolveDisplayName(address);
       
       // Use score from leaderboard for the primary sorted value
       if (type === 'total_won') {
         leaderboard.push({
           rank: Math.floor(i / 2) + 1,
           address,
           displayName,
           totalWon: score.toString(), // Use score as totalWon
           spins: userStats.spins,
           wins: userStats.wins,
           winRatio: userStats.spins > 0 
             ? ((userStats.wins / userStats.spins) * 100).toFixed(1)
             : "0.0",
         });
       } else { // win_ratio leaderboard
         leaderboard.push({
           rank: Math.floor(i / 2) + 1,
           address,
           displayName,
           totalWon: userStats.totalWon, // Get from stats
           spins: userStats.spins,
           wins: userStats.wins,
           winRatio: score.toFixed(1), // Use score as winRatio
         });
       }
    }
    
    return leaderboard;
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return [];
  }
} 