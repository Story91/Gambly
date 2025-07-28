"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWalletClient,
  usePublicClient,
  useSignTypedData,
} from "wagmi";
import {
  Transaction,
  TransactionButton,
  TransactionToast,
  TransactionToastAction,
  TransactionToastIcon,
  TransactionToastLabel,
  TransactionError,
  TransactionResponse,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionStatus,
} from "@coinbase/onchainkit/transaction";

import { Avatar, Name } from "@coinbase/onchainkit/identity";
import { useNotification } from "@coinbase/onchainkit/minikit";
import { createFlaunch, ReadWriteFlaunchSDK } from "@flaunch/sdk";
import { CONTRACTS, ERC20_ABI } from "../../lib/contracts";
import { AnimatedSlotMachine } from "./AnimatedSlotMachine";
import {
  getWinDifficulty,
  callGamblyWinAsOwner,
} from "../../lib/gambling-service";
import { checkWin } from "../../lib/random";
import { encodeFunctionData, formatUnits, parseEther } from "viem";
import { base } from "viem/chains";

export function GamblingCard() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const {
    signTypedData,
    data: signature,
    status: sigStatus,
  } = useSignTypedData();

  // Add swap modal states
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapView, setSwapView] = useState<"buy" | "sell" | "alternative">(
    "buy",
  );

  // Flaunch SDK states
  const [buyAmount, setBuyAmount] = useState("0.01");
  const [sellAmount, setSellAmount] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [slippagePercent, setSlippagePercent] = useState(5);
  const [coinMetadata, setCoinMetadata] = useState<{
    symbol: string;
    name: string;
    image?: string;
  } | null>(null);

  // Initialize Flaunch SDK
  const flaunchSDK = useMemo(() => {
    if (!publicClient || !walletClient) return null;

    return createFlaunch({
      publicClient,
      walletClient,
    }) as ReadWriteFlaunchSDK;
  }, [publicClient, walletClient]);

  // Load coin metadata
  const loadCoinMetadata = useCallback(async () => {
    if (!flaunchSDK) return;

    try {
      const metadata = await flaunchSDK.getCoinMetadata(
        CONTRACTS.ERC20_ADDRESS,
      );
      setCoinMetadata(metadata);
      console.log("Loaded coin metadata:", metadata);
    } catch (error) {
      console.error("Failed to load coin metadata:", error);
    }
  }, [flaunchSDK]);

  // Load metadata when SDK is ready
  useEffect(() => {
    loadCoinMetadata();
  }, [loadCoinMetadata]);

  const [winDifficulty, setWinDifficulty] = useState<bigint | null>(null);
  const [lastResult, setLastResult] = useState<{
    won: boolean;
    txHash?: string;
    claimTxHash?: string; // Add claim transaction hash
    claimed?: boolean;
  } | null>(null);
  const [transactionKey, setTransactionKey] = useState(0);

  // Slot machine states
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState<"win" | "lose" | null>(null);

  // User stats state
  const [userStats, setUserStats] = useState({
    spins: 0,
    wins: 0,
    totalWon: "0",
  });

  // Global stats state
  const [globalStats, setGlobalStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalPlayers: 0,
  });

  const sendNotification = useNotification();

  // Load win difficulty from contract
  const loadWinDifficulty = useCallback(async () => {
    try {
      const difficulty = await getWinDifficulty();
      setWinDifficulty(difficulty);
      console.log("Loaded win difficulty:", difficulty.toString());
    } catch (error) {
      console.error("Failed to load win difficulty:", error);
      await sendNotification({
        title: "Error",
        body: "Failed to load win difficulty from contract",
      });
    }
  }, [sendNotification]);

  // Load user stats and create account when address changes
  useEffect(() => {
    if (!address) {
      setUserStats({ spins: 0, wins: 0, totalWon: "0" });
      return;
    }

    const loadUserStats = async () => {
      try {
        // Create user account if doesn't exist
        await fetch("/api/user-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, action: "create" }),
        });

        // Load user stats
        const response = await fetch(`/api/user-stats?address=${address}`);
        if (response.ok) {
          const stats = await response.json();
          setUserStats(stats);
        }
      } catch (error) {
        console.error("Error loading user stats:", error);
      }
    };

    loadUserStats();
  }, [address]);

  // Load global stats and win difficulty
  useEffect(() => {
    const loadGlobalStats = async () => {
      try {
        const response = await fetch("/api/global-stats");
        if (response.ok) {
          const stats = await response.json();
          setGlobalStats(stats);
        }
      } catch (error) {
        console.error("Error loading global stats:", error);
      }
    };

    const loadInitialData = async () => {
      await Promise.all([loadGlobalStats(), loadWinDifficulty()]);
    };

    loadInitialData();
  }, [loadWinDifficulty]);

  // Function to refresh global stats
  const refreshGlobalStats = useCallback(async () => {
    try {
      const response = await fetch("/api/global-stats");
      if (response.ok) {
        const stats = await response.json();
        setGlobalStats(stats);
      }
    } catch (error) {
      console.error("Error refreshing global stats:", error);
    }
  }, []);

  // Read token balance from contract
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.ERC20_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read jackpot pool balance from gambling contract
  const { data: jackpotBalance, refetch: refetchJackpotBalance } =
    useReadContract({
      address: CONTRACTS.ERC20_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [CONTRACTS.GAMBLING_ADDRESS],
    });

  // Format token balance for display
  const formattedBalance = useMemo(() => {
    if (!tokenBalance) return "$$$";
    try {
      const balance = formatUnits(tokenBalance as bigint, 18);
      const numBalance = parseFloat(balance);
      if (numBalance === 0) return "0";
      if (numBalance < 0.01) return "<0.01";
      return numBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } catch {
      return "$$$";
    }
  }, [tokenBalance]);

  // Format jackpot pool balance for display
  const formattedJackpotBalance = useMemo(() => {
    if (!jackpotBalance) return ".............";
    try {
      const balance = formatUnits(jackpotBalance as bigint, 18);
      const numBalance = parseFloat(balance);
      if (numBalance === 0) return "0";
      return numBalance.toLocaleString(undefined, { maximumFractionDigits: 0 });
    } catch {
      return ".............";
    }
  }, [jackpotBalance]);

  // ERC20 transfer transaction call
  const transferCalls = useMemo(() => {
    if (!address) return [];

    const amount = BigInt(10000 * 10 ** 18);

    return [
      {
        to: CONTRACTS.ERC20_ADDRESS,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [CONTRACTS.GAMBLING_ADDRESS, amount],
        }),
        value: BigInt(0),
      },
    ];
  }, [address]);

  // Handle successful ERC20 transfer
  const handleTransferSuccess = useCallback(
    async (response: TransactionResponse) => {
      const transactionHash = response.transactionReceipts[0].transactionHash;
      console.log(`ERC20 Transfer successful: ${transactionHash}`);

      // Refetch balance after transfer
      refetchBalance();
      refetchJackpotBalance();

      // Get win difficulty if not loaded
      let currentWinDifficulty = winDifficulty;
      if (!currentWinDifficulty) {
        try {
          currentWinDifficulty = await getWinDifficulty();
          setWinDifficulty(currentWinDifficulty);
        } catch (err) {
          console.error("Failed to load win difficulty:", err);
        }
      }

      // Check if user wins (only if we have win difficulty)
      const userWins = currentWinDifficulty
        ? checkWin(currentWinDifficulty, transactionHash)
        : false;

      // Set slot result and stop spinning
      setSlotResult(userWins ? "win" : "lose");
      setIsSlotSpinning(false);

      if (userWins && address) {
        try {
          // Automatically call gamblyWin as contract owner
          const claimTxHash = await callGamblyWinAsOwner(address);
          setLastResult({
            won: true,
            txHash: transactionHash, // Gamble transaction
            claimTxHash: claimTxHash, // Claim transaction
            claimed: true,
          });

          // Refetch balance after claiming prize
          refetchBalance();
          refetchJackpotBalance();

          // Update user stats for win
          try {
            const jackpot = parseFloat(
              formatUnits(jackpotBalance as bigint, 18),
            );
            const fee = jackpot * 0.05;
            const netJackpot = jackpot - fee;

            const statsResponse = await fetch("/api/user-stats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                address,
                action: "update",
                isWin: true,
                tokensWon: String(netJackpot),
              }),
            });
            if (statsResponse.ok) {
              const updatedStats = await statsResponse.json();
              setUserStats(updatedStats);
              // Refresh global stats after successful update
              await refreshGlobalStats();
            }
          } catch (statsError) {
            console.error("Error updating stats for win:", statsError);
          }

          await sendNotification({
            title: "🎉 Congratulations! You Won!",
            body: `You won the gamble! Prize automatically claimed! View transaction: https://basescan.org/tx/${claimTxHash}`,
          });
        } catch (error) {
          console.error("Failed to automatically claim prize:", error);
          setLastResult({ won: true, txHash: transactionHash });

          // Still update stats for spin even if claim failed
          try {
            const statsResponse = await fetch("/api/user-stats", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                address,
                action: "update",
                isWin: true,
                tokensWon: "0", // No tokens won since claim failed
              }),
            });
            if (statsResponse.ok) {
              const updatedStats = await statsResponse.json();
              setUserStats(updatedStats);
              // Refresh global stats after successful update
              await refreshGlobalStats();
            }
          } catch (statsError) {
            console.error("Error updating stats for failed win:", statsError);
          }

          await sendNotification({
            title: "🎉 Congratulations! You Won!",
            body: `You won the gamble! Prize claim failed. Please try again.`,
          });
        }
      } else {
        setLastResult({ won: false, txHash: transactionHash }); // Add txHash for losing transactions too

        // Update user stats for loss
        try {
          const statsResponse = await fetch("/api/user-stats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address,
              action: "update",
              isWin: false,
              tokensWon: "0",
            }),
          });
          if (statsResponse.ok) {
            const updatedStats = await statsResponse.json();
            setUserStats(updatedStats);
            // Refresh global stats after successful update
            await refreshGlobalStats();
          }
        } catch (statsError) {
          console.error("Error updating stats for loss:", statsError);
        }

        await sendNotification({
          title: "Better luck next time!",
          body: `Transfer completed but you didn't win this round. Try again!`,
        });
      }

      // Reset transaction component to show gamble button again
      setTransactionKey((prev) => prev + 1);
    },
    [
      winDifficulty,
      address,
      sendNotification,
      refetchBalance,
      refetchJackpotBalance,
      refreshGlobalStats,
    ],
  );

  // Handle transaction error
  const handleTransferError = useCallback(
    async (error: TransactionError) => {
      console.error("ERC20 Transfer failed:", error);
      setIsSlotSpinning(false);
      setSlotResult("lose"); // Show lose instead of null when transaction fails

      // Don't update stats for failed transactions - spin didn't actually happen

      await sendNotification({
        title: "Transfer Failed",
        body: "The ERC20 transfer transaction failed. Please try again.",
      });
    },
    [sendNotification],
  );

  const formatDisplayName = (addr: string) => {
    // Show shortened address
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Buy SLOT tokens with ETH using Flaunch SDK
  const buyWithETH = useCallback(async () => {
    if (!flaunchSDK || !address) {
      await sendNotification({
        title: "Error",
        body: "Wallet not connected or SDK not ready",
      });
      return;
    }

    setIsLoading(true);
    setTransactionHash(null);

    try {
      const hash = await flaunchSDK.buyCoin({
        coinAddress: CONTRACTS.ERC20_ADDRESS,
        slippagePercent,
        swapType: "EXACT_IN",
        amountIn: parseEther(buyAmount),
      });

      setTransactionHash(hash);

      // Wait for confirmation
      const receipt = await flaunchSDK.drift.waitForTransaction({ hash });

      if (receipt && receipt.status === "success") {
        await sendNotification({
          title: "🎉 Purchase Successful!",
          body: `Successfully bought SLOT tokens! TX: ${hash.slice(0, 10)}...`,
        });

        // Refresh balance
        refetchBalance();

        // Close modal after successful purchase
        setTimeout(() => {
          setShowSwapModal(false);
          setSwapView("buy");
        }, 2000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Buy failed:", error);
      await sendNotification({
        title: "❌ Purchase Failed",
        body: error instanceof Error ? error.message : "Transaction failed",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    flaunchSDK,
    address,
    buyAmount,
    slippagePercent,
    sendNotification,
    refetchBalance,
    setShowSwapModal,
    setSwapView,
  ]);

  // Sell SLOT tokens with Permit2 support
  const sellSLOTTokens = useCallback(async () => {
    if (!flaunchSDK || !address) {
      await sendNotification({
        title: "Error",
        body: "Wallet not connected or SDK not ready",
      });
      return;
    }

    setIsLoading(true);
    setTransactionHash(null);

    try {
      const amountIn = parseEther(sellAmount);

      // Check allowance and permit if needed
      const { allowance } = await flaunchSDK.getPermit2AllowanceAndNonce(
        CONTRACTS.ERC20_ADDRESS,
      );

      if (allowance < amountIn) {
        // Need permit
        const { typedData, permitSingle } =
          await flaunchSDK.getPermit2TypedData(CONTRACTS.ERC20_ADDRESS);

        await sendNotification({
          title: "🔐 Signature Required",
          body: "Please sign the permit to allow token sale",
        });

        signTypedData(typedData);

        // Wait for signature
        await new Promise((resolve) => {
          const checkSignature = () => {
            if (signature) {
              resolve(signature);
            } else {
              setTimeout(checkSignature, 100);
            }
          };
          checkSignature();
        });

        if (!signature) {
          throw new Error("Signature required for token sale");
        }

        // Sell with permit
        const hash = await flaunchSDK.sellCoin({
          coinAddress: CONTRACTS.ERC20_ADDRESS,
          amountIn,
          slippagePercent,
          permitSingle,
          signature,
        });

        setTransactionHash(hash);
      } else {
        // Already approved, sell directly
        const hash = await flaunchSDK.sellCoin({
          coinAddress: CONTRACTS.ERC20_ADDRESS,
          amountIn,
          slippagePercent,
        });

        setTransactionHash(hash);
      }

      // Wait for confirmation
      const receipt = await flaunchSDK.drift.waitForTransaction({
        hash: transactionHash as `0x${string}`,
      });

      if (receipt && receipt.status === "success") {
        await sendNotification({
          title: "🎉 Sale Successful!",
          body: `Successfully sold SLOT tokens! TX: ${transactionHash!.slice(0, 10)}...`,
        });

        // Refresh balance
        refetchBalance();

        // Close modal after successful sale
        setTimeout(() => {
          setShowSwapModal(false);
          setSwapView("buy");
        }, 2000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Sell failed:", error);
      await sendNotification({
        title: "❌ Sale Failed",
        body: error instanceof Error ? error.message : "Transaction failed",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    flaunchSDK,
    address,
    sellAmount,
    slippagePercent,
    sendNotification,
    refetchBalance,
    setShowSwapModal,
    setSwapView,
    signTypedData,
    signature,
    transactionHash,
  ]);

  return (
    <div className="space-y-4">
      {address && (
        <div className="flex flex-col gap-4 bg-gray-100 p-4 rounded-lg">
          {/* User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {address ? (
                <Avatar
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  address={address as `0x${string}`}
                  chain={base}
                />
              ) : (
                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">0x</span>
                </div>
              )}
              <div>
                <p className="font-medium text-black">
                  {address ? (
                    <Name
                      className="font-medium text-black"
                      address={address as `0x${string}`}
                      chain={base}
                    >
                      <span className="font-medium text-black">
                        {formatDisplayName(address)}
                      </span>
                    </Name>
                  ) : (
                    "......"
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {formattedBalance} $SLOT
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSwapModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              GET MORE
            </button>
          </div>

          {/* Gambling King Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">👑</span>
              <span className="text-orange-500 font-bold">GAMBLING KING</span>
            </div>
            <div className="flex space-x-4 text-sm">
              <span className="text-black">{userStats.spins} SPINS</span>
              <span className="text-black">{userStats.wins} WINS</span>
            </div>
          </div>
        </div>
      )}
      {/* Jackpot Pool */}
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-600 mb-1">
          {formattedJackpotBalance} $SLOT
        </div>
        <div className="text-sm text-gray-600 mb-4 flex items-center justify-center space-x-2">
          <span className="animate-bounce">💰</span>
          <span className="animate-pulse">JACKPOT POOL</span>
          <span className="animate-bounce" style={{ animationDelay: "0.5s" }}>
            🎰
          </span>
        </div>

        <div className="flex justify-between text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 animate-pulse">
              {globalStats.totalGames.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">TOTAL GAMES PLAYED</div>
          </div>
          <div>
            <div
              className="text-2xl font-bold text-blue-600 animate-pulse"
              style={{ animationDelay: "0.3s" }}
            >
              1/{winDifficulty?.toString()}
            </div>
            <div className="text-xs text-gray-600">CURRENT WIN CHANCE</div>
          </div>
        </div>
      </div>

      <AnimatedSlotMachine
        isSpinning={isSlotSpinning}
        result={slotResult}
        isGlobalJackpot={slotResult === "win"}
      />

      <div className="text-center">
        {address ? (
          <Transaction
            key={transactionKey}
            calls={transferCalls}
            onSuccess={handleTransferSuccess}
            onError={handleTransferError}
          >
            <div
              onClick={() => {
                if (!isSlotSpinning) {
                  setIsSlotSpinning(true);
                  // Don't set slotResult to null here - let it keep spinning until transaction completes
                }
              }}
            >
              <TransactionButton
                className="bg-blue-600 text-white text-lg font-bold py-4 px-12 rounded-lg w-full hover:bg-blue-700"
                text="GAMBLE"
                pendingOverride={{
                  text: "GAMBLING...",
                }}
              />
            </div>
            <TransactionStatus>
              <TransactionStatusAction />
              <TransactionStatusLabel />
            </TransactionStatus>
            <TransactionToast className="mb-4">
              <TransactionToastIcon />
              <TransactionToastLabel />
              <TransactionToastAction />
            </TransactionToast>
          </Transaction>
        ) : (
          <p className="text-yellow-600 text-sm text-center mt-2">
            Connect your wallet to start gambling
          </p>
        )}
      </div>

      {lastResult && (
        <div
          className={`p-3 rounded-lg ${
            lastResult.won
              ? "bg-green-100 border border-green-300"
              : "bg-red-100 border border-red-300"
          }`}
        >
          <div className="text-sm">
            {lastResult.won
              ? lastResult.claimed
                ? "🎉 Prize Claimed!"
                : "🎉 You Won!"
              : "Better luck next time!"}
          </div>
          {lastResult.txHash && (
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <p>
                <a
                  href={`https://basescan.org/tx/${lastResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  🎲 Gamble TX: {lastResult.txHash.slice(0, 20)}...
                </a>
              </p>
              {lastResult.claimTxHash && (
                <p>
                  <a
                    href={`https://basescan.org/tx/${lastResult.claimTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800 underline"
                  >
                    🎉 Prize TX: {lastResult.claimTxHash.slice(0, 20)}...
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Swap Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
            <button
              onClick={() => setShowSwapModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {coinMetadata
                  ? `Trade ${coinMetadata.symbol}`
                  : "Trade SLOT Tokens"}
              </h3>
              <p className="text-sm text-gray-600">
                {coinMetadata
                  ? coinMetadata.name
                  : "Choose your preferred trading method!"}
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
              <button
                onClick={() => setSwapView("buy")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  swapView === "buy"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                💰 Buy
              </button>
              <button
                onClick={() => setSwapView("sell")}
                disabled={true}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed bg-gray-200 text-gray-400`}
              >
                💸 Sell (Soon)
              </button>
              <button
                onClick={() => setSwapView("alternative")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  swapView === "alternative"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🔄 DEX
              </button>
            </div>

            {/* Content based on selected view */}
            {swapView === "buy" ? (
              <div className="space-y-4">
                {/* Transaction Status */}
                {transactionHash && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">⏳</span>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Transaction Pending
                        </p>
                        <a
                          href={`https://basescan.org/tx/${transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on BaseScan: {transactionHash.slice(0, 10)}...
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ETH Amount
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.01"
                    disabled={isLoading}
                  />
                </div>

                {/* Slippage Settings */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slippage Tolerance: {slippagePercent}%
                  </label>
                  <div className="flex space-x-2">
                    {[1, 3, 5, 10].map((percent) => (
                      <button
                        key={percent}
                        onClick={() => setSlippagePercent(percent)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          slippagePercent === percent
                            ? "bg-blue-600 text-white"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                        disabled={isLoading}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  onClick={buyWithETH}
                  disabled={isLoading || !flaunchSDK || !address}
                  className="w-full bg-blue-600 text-white p-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center space-x-2">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>💎</span>
                        <span>Buy SLOT with ETH</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs opacity-90 mt-1">
                    Powered by Flaunch SDK
                  </p>
                </button>

                {/* Token Metadata */}
                {coinMetadata && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      {coinMetadata.image && (
                        <img
                          src={coinMetadata.image}
                          alt={coinMetadata.symbol}
                          className="w-10 h-10 rounded-full border-2 border-green-300"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600">🎰</span>
                          <p className="text-sm font-medium text-green-800">
                            {coinMetadata.name}
                          </p>
                        </div>
                        <p className="text-xs text-green-600">
                          Symbol: {coinMetadata.symbol}
                        </p>
                        <p className="text-xs text-green-500">
                          Gambly Slot Utility Token
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info about LP */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">ℹ️</span>
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Liquidity Pool Available
                      </p>
                      <p className="text-xs text-blue-600">
                        LP: 0x498581ff718922c3f8e6a244956af099b2652b2b
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : swapView === "sell" ? (
              <div className="space-y-4">
                {/* Transaction Status */}
                {transactionHash && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-600">⏳</span>
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Transaction Pending
                        </p>
                        <a
                          href={`https://basescan.org/tx/${transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on BaseScan: {transactionHash.slice(0, 10)}...
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sell Amount Input */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SLOT Amount to Sell
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="100"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formattedBalance} SLOT
                  </p>
                </div>

                {/* Slippage Settings */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slippage Tolerance: {slippagePercent}%
                  </label>
                  <div className="flex space-x-2">
                    {[1, 3, 5, 10].map((percent) => (
                      <button
                        key={percent}
                        onClick={() => setSlippagePercent(percent)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          slippagePercent === percent
                            ? "bg-red-600 text-white"
                            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                        }`}
                        disabled={isLoading}
                      >
                        {percent}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permit2 Info */}
                {sigStatus === "pending" && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-600">🔐</span>
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Signature Required
                        </p>
                        <p className="text-xs text-yellow-600">
                          Please sign the permit to allow token sale
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sell Button */}
                <button
                  onClick={sellSLOTTokens}
                  disabled={isLoading || !flaunchSDK || !address}
                  className="w-full bg-red-600 text-white p-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center space-x-2">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>💸</span>
                        <span>Sell SLOT for ETH</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs opacity-90 mt-1">
                    Powered by Flaunch SDK with Permit2
                  </p>
                </button>

                {/* Info about LP */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600">ℹ️</span>
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Gasless Token Approvals
                      </p>
                      <p className="text-xs text-blue-600">
                        Using Permit2 for secure, gasless token permissions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alternative Swaps Header */}
                <div className="text-center mb-4">
                  <h4 className="text-sm font-medium text-gray-700">
                    External DEX Options
                  </h4>
                  <p className="text-xs text-gray-500">
                    Use external platforms for swapping
                  </p>
                </div>

                {/* Uniswap Integration */}
                <div className="space-y-3">
                  {/* ETH -> SLOT via Uniswap */}
                  <a
                    href={`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${CONTRACTS.ERC20_ADDRESS}&chain=base`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-lg text-center font-medium hover:from-pink-600 hover:to-purple-700 transition-colors"
                    onClick={() => {
                      setTimeout(() => refetchBalance(), 2000);
                    }}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🦄</span>
                      <span>Swap ETH → SLOT on Uniswap</span>
                      <span>↗️</span>
                    </div>
                    <p className="text-xs opacity-90 mt-1">
                      Opens Uniswap in new tab
                    </p>
                  </a>

                  {/* USDC -> SLOT via Uniswap */}
                  <a
                    href={`https://app.uniswap.org/#/swap?inputCurrency=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&outputCurrency=${CONTRACTS.ERC20_ADDRESS}&chain=base`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-lg text-center font-medium hover:from-green-600 hover:to-blue-700 transition-colors"
                    onClick={() => {
                      setTimeout(() => refetchBalance(), 2000);
                    }}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🦄</span>
                      <span>Swap USDC → SLOT on Uniswap</span>
                      <span>↗️</span>
                    </div>
                    <p className="text-xs opacity-90 mt-1">
                      Opens Uniswap in new tab
                    </p>
                  </a>

                  {/* DEX Screener link */}
                  <a
                    href={`https://dexscreener.com/base/${CONTRACTS.ERC20_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-gray-600 text-white p-3 rounded-lg text-center font-medium hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>📊</span>
                      <span>View SLOT on DexScreener</span>
                      <span>↗️</span>
                    </div>
                    <p className="text-xs opacity-90 mt-1">
                      Check prices and liquidity
                    </p>
                  </a>
                </div>
              </div>
            )}

            {/* Close and Refresh Button */}
            <button
              onClick={() => {
                refetchBalance();
                setShowSwapModal(false);
                setSwapView("buy"); // Reset to buy view
                setTransactionHash(null); // Clear transaction hash
              }}
              className="w-full bg-gray-600 text-white p-3 rounded-lg font-medium hover:bg-gray-700 transition-colors mt-4"
            >
              🔄 Refresh Balance & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
