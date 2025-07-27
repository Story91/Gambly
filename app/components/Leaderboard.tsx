"use client";

import { useState, useEffect } from "react";

interface LeaderboardEntry {
  rank: number;
  address: string;
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
        <div className="grid grid-cols-[7%_1fr_1fr_1fr] gap-4 text-sm font-medium border-b pb-2 text-black sticky top-0 bg-white z-10">
          <span>#</span>
          <span>address</span>
          <span>total won ($SLOT)</span>
          <span>spins/win ratio</span>
        </div>
        <div className="space-y-2 pt-2">
          {isLoading ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[7%_1fr_1fr_1fr] gap-4 items-center text-sm py-2 rounded text-black"
              >
                <div className="flex">
                  <span className="w-6 h-6 flex items-center justify-center rounded text-white bg-gray-300 animate-pulse">
                    {i + 1}
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))
          ) : error ? (
            <div className="text-center py-4 text-gray-500">
              {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No players yet. Be the first to gamble!
            </div>
          ) : (
            leaderboard.map((player) => (
              <div
                key={player.address}
                className="grid grid-cols-[7%_1fr_1fr_1fr] gap-4 items-center text-sm py-2 rounded text-black hover:bg-gray-50"
              >
                <div className="flex">
                  <span className="w-6 h-6 flex items-center justify-center rounded text-white bg-blue-500">
                    {player.rank}
                  </span>
                </div>
                <div className="text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                  {formatAddress(player.address)}
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {formatTokens(player.totalWon)}
                </div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {player.spins}/{player.wins} ({player.winRatio}%)
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
