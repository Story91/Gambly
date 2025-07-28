"use client";

import { useState, useEffect, useCallback } from "react";
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

interface LeaderboardResult {
  entries: LeaderboardEntry[];
  pagination: {
    total: number;
    hasMore: boolean;
    currentOffset: number;
    limit: number;
  };
}

export function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
    currentOffset: 0,
    limit: 10
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);

  const fetchLeaderboard = useCallback(async (offset: number = 0, withNames: boolean = false, isPageChange: boolean = false) => {
    try {
      if (!withNames) {
        if (isPageChange) {
          setIsChangingPage(true);
          setLeaderboard([]); // Clear old data immediately
        } else {
          setIsLoading(true);
        }
      } else {
        setIsLoadingNames(true);
      }
      
      const url = `/api/leaderboard?type=total_won&limit=10&offset=${offset}${withNames ? '&resolveNames=true' : ''}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data: LeaderboardResult = await response.json();
        
        if (useInfiniteScroll && offset > 0 && !withNames) {
          // For infinite scroll, append new data
          setLeaderboard(current => [...current, ...data.entries]);
        } else {
          // For pagination or initial load, replace data
          setLeaderboard(data.entries);
        }
        
        setPagination(data.pagination);
        setError(null);
        
        // If this was the initial load without names, start loading names in background
        if (!withNames && data.entries.length > 0 && !isPageChange) {
          setTimeout(() => {
            fetchLeaderboardNames(offset);
          }, 100);
        }
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      if (!withNames) {
        setIsLoading(false);
        setIsChangingPage(false);
      } else {
        setIsLoadingNames(false);
      }
    }
  }, [useInfiniteScroll]);

  const fetchLeaderboardNames = useCallback(async (offset: number = 0) => {
    try {
      setIsLoadingNames(true);
      const response = await fetch(`/api/leaderboard?type=total_won&limit=10&offset=${offset}&resolveNames=true`);
      
      if (response.ok) {
        const data: LeaderboardResult = await response.json();
        // Update only the display names to avoid flickering
        setLeaderboard(current => 
          current.map(entry => {
            const updated = data.entries.find(e => e.address === entry.address);
            return updated ? { ...entry, displayName: updated.displayName } : entry;
          })
        );
      }
    } catch (err) {
      console.error('Error fetching leaderboard names:', err);
    } finally {
      setIsLoadingNames(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard(0);
    
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(() => fetchLeaderboard(currentPage * 10), 30000);
    
    return () => clearInterval(interval);
  }, [fetchLeaderboard, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchLeaderboard(newPage * 10, false, true); // Pass isPageChange = true
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchLeaderboard(newPage * 10, false, true); // Pass isPageChange = true
    }
  };

  const loadMoreInfinite = () => {
    if (pagination.hasMore && !isLoading) {
      const newOffset = leaderboard.length;
      fetchLeaderboard(newOffset, false, false);
    }
  };

  // Calculate max page to prevent going beyond available data
  const maxPage = Math.ceil(pagination.total / pagination.limit) - 1;
  const canGoNext = currentPage < maxPage && pagination.hasMore;
  const canGoPrev = currentPage > 0;

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
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">LEADERBOARD</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseInfiniteScroll(!useInfiniteScroll)}
            className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            {useInfiniteScroll ? 'Pagination' : 'Scroll'}
          </button>
          <div className="text-xs text-gray-500">
            Sorted by games played
          </div>
        </div>
        {isLoadingNames && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            Loading names...
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto max-h-[300px]">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2 text-xs font-medium border-b pb-2 text-black sticky top-0 bg-white z-10 px-1">
          <span className="text-center">#</span>
          <span>Player</span>
          <span className="text-center">Won</span>
          <span className="text-center">W/L</span>
        </div>
        <div className="space-y-1 pt-2">
          {isLoading || isChangingPage ? (
            // Loading skeleton
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <div className="text-xs text-gray-500">
                {isChangingPage ? 'Loading page...' : 'Loading leaderboard...'}
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-gray-500 text-xs">
              {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-xs">
              No players yet. Be the first to gamble!
            </div>
          ) : (
            <>
              {leaderboard.map((player) => (
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
              ))}
              
              {/* Infinite scroll load more button */}
              {useInfiniteScroll && pagination.hasMore && (
                <div className="text-center py-2">
                  <button
                    onClick={loadMoreInfinite}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    {isLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Pagination Controls - only show if not using infinite scroll */}
      {!useInfiniteScroll && !isLoading && !isChangingPage && leaderboard.length > 0 && pagination.total > pagination.limit && (
        <div className="flex justify-between items-center mt-3 pt-2 border-t">
          <button
            onClick={handlePrevPage}
            disabled={!canGoPrev}
            className={`px-3 py-1 text-xs font-medium rounded ${
              !canGoPrev 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            ← PREV
          </button>
          
          <div className="text-xs text-gray-600">
            Page {currentPage + 1} of {Math.ceil(pagination.total / pagination.limit)} • {pagination.total} players
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={!canGoNext}
            className={`px-3 py-1 text-xs font-medium rounded ${
              !canGoNext 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            NEXT →
          </button>
        </div>
      )}
    </div>
  );
}
