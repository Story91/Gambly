"use client";

import { useState, useEffect } from "react";
import { Avatar, Name } from "@coinbase/onchainkit/identity";
import { base } from "viem/chains";

interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName?: string; // ENS or basename if available
  totalWon: string;
  spins: number;
  wins: number;
  winRatio: string;
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/leaderboard?type=total_won&limit=10');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
        setError(null);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatDisplayName = (player: LeaderboardEntry) => {
    if (player.displayName) {
      return player.displayName;
    }
    return `${player.address.slice(0, 6)}...${player.address.slice(-4)}`;
  };

  const formatTokens = (totalWon: string) => {
    const num = parseFloat(totalWon);
    if (num === 0) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  return (
    <div>
      <h3 className="font-bold text-lg mb-3">LEADERBOARD</h3>
      <div className="overflow-y-auto max-h-[300px]">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 text-xs font-medium border-b pb-2 text-black sticky top-0 bg-white z-10 px-1">
          <span className="text-center">#</span>
          <span>Player</span>
          <span className="text-center">Won</span>
          <span className="text-center">W/L</span>
        </div>
        <div className="space-y-1 pt-2">
          {isLoading ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center text-xs py-2 rounded text-black px-1"
              >
                <div className="flex justify-center">
                  <span className="w-5 h-5 flex items-center justify-center rounded text-white bg-gray-300 animate-pulse text-xs">
                    {i + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse flex-1"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-8"></div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-4 text-gray-500 text-xs">
              {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-xs">
              No players yet. Be the first to gamble!
            </div>
          ) : (
            leaderboard.map((player) => (
              <div
                key={player.address}
                className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center text-xs py-2 rounded text-black hover:bg-gray-50 px-1 min-h-[2rem]"
              >
                <div className="flex justify-center">
                  <span className="w-5 h-5 flex items-center justify-center rounded text-white bg-blue-500 text-xs font-bold">
                    {player.rank}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar 
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    address={player.address as `0x${string}`}
                    chain={base}
                  />
                  <div className="min-w-0 flex-1">
                    <Name 
                      className="text-xs font-medium truncate block max-w-full"
                      address={player.address as `0x${string}`}
                      chain={base}
                    >
                      <span className="text-xs font-medium truncate block max-w-full">
                        {formatDisplayName(player)}
                      </span>
                    </Name>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-semibold text-green-600">
                    {formatTokens(player.totalWon)}
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-xs">
                    <div className="font-medium">{player.wins}/{player.spins}</div>
                    <div className="text-gray-500 text-[10px]">({player.winRatio}%)</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
