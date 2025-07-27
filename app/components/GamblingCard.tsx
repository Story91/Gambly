"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useEnsAvatar } from "wagmi";
import Image from "next/image";
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
import { useNotification } from "@coinbase/onchainkit/minikit";
import { Button, Icon } from "./DemoComponents";
import { CONTRACTS, ERC20_ABI } from "../../lib/contracts";
import { AnimatedSlotMachine } from "./AnimatedSlotMachine";
import {
  getWinDifficulty,
  callGamblyWinAsOwner,
} from "../../lib/gambling-service";
import { checkWin } from "../../lib/random";
import { encodeFunctionData, formatUnits } from "viem";
import blockies from "ethereum-blockies";

// Avatar Component with ENS -> Blockies -> Splash fallback
function UserAvatar({ address }: { address: string }) {
  const [avatarSrc, setAvatarSrc] = useState<string>("");
  const [avatarError, setAvatarError] = useState(false);

  // Try to get ENS avatar
  const { data: ensAvatar } = useEnsAvatar({
    name: address as `0x${string}`,
  });

  useEffect(() => {
    if (ensAvatar && !avatarError) {
      setAvatarSrc(ensAvatar);
    } else if (address && !ensAvatar) {
      // Generate blockies identicon
      try {
        const canvas = blockies.create({
          seed: address.toLowerCase(),
          size: 10,
          scale: 4,
        });
        setAvatarSrc(canvas.toDataURL());
      } catch (err) {
        console.error("Blockies error:", err);
        setAvatarSrc("/splash.gif"); // Fallback to splash.gif
      }
    }
  }, [address, ensAvatar, avatarError]);

  const handleAvatarError = () => {
    setAvatarError(true);
    if (address) {
      try {
        const canvas = blockies.create({
          seed: address.toLowerCase(),
          size: 10,
          scale: 4,
        });
        setAvatarSrc(canvas.toDataURL());
      } catch {
        setAvatarSrc("/splash.gif");
      }
    } else {
      setAvatarSrc("/splash.gif");
    }
  };

  return (
    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center overflow-hidden">
      {avatarSrc ? (
        <Image
          src={avatarSrc}
          alt="Avatar"
          width={40}
          height={40}
          className="w-full h-full rounded-full object-cover"
          onError={handleAvatarError}
        />
      ) : (
        <span className="text-white font-bold text-xs">0x</span>
      )}
    </div>
  );
}

export function GamblingCard() {
  const { address } = useAccount();
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
  const [userStats, setUserStats] = useState({ spins: 0, wins: 0, totalWon: "0" });

  const sendNotification = useNotification();

  // Load user stats and create account when address changes
  useEffect(() => {
    if (!address) {
      setUserStats({ spins: 0, wins: 0, totalWon: "0" });
      return;
    }

    const loadUserStats = async () => {
      try {
        // Create user account if doesn't exist
        await fetch('/api/user-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, action: 'create' }),
        });

        // Load user stats
        const response = await fetch(`/api/user-stats?address=${address}`);
        if (response.ok) {
          const stats = await response.json();
          setUserStats(stats);
        }
      } catch (error) {
        console.error('Error loading user stats:', error);
      }
    };

    loadUserStats();
  }, [address]);

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
             txHash: transactionHash,     // Gamble transaction
             claimTxHash: claimTxHash,    // Claim transaction
             claimed: true,
           });

           // Refetch balance after claiming prize
           refetchBalance();
           refetchJackpotBalance();

           // Update user stats for win (assuming 50k tokens prize)
           try {
             const statsResponse = await fetch('/api/user-stats', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                 address, 
                 action: 'update', 
                 isWin: true, 
                 tokensWon: (50000 * 10**18).toString() 
               }),
             });
             if (statsResponse.ok) {
               const updatedStats = await statsResponse.json();
               setUserStats(updatedStats);
             }
           } catch (statsError) {
             console.error('Error updating stats for win:', statsError);
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
             const statsResponse = await fetch('/api/user-stats', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                 address, 
                 action: 'update', 
                 isWin: true, 
                 tokensWon: "0" // No tokens won since claim failed
               }),
             });
             if (statsResponse.ok) {
               const updatedStats = await statsResponse.json();
               setUserStats(updatedStats);
             }
           } catch (statsError) {
             console.error('Error updating stats for failed win:', statsError);
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
           const statsResponse = await fetch('/api/user-stats', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
               address, 
               action: 'update', 
               isWin: false, 
               tokensWon: "0" 
             }),
           });
           if (statsResponse.ok) {
             const updatedStats = await statsResponse.json();
             setUserStats(updatedStats);
           }
         } catch (statsError) {
           console.error('Error updating stats for loss:', statsError);
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

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="space-y-4">
      {address && (
        <div className="flex flex-col gap-4 bg-gray-100 p-4 rounded-lg">
          {/* User Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {address ? (
                <UserAvatar address={address} />
              ) : (
                <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">0x</span>
                </div>
              )}
              <div>
                <p className="font-medium text-black">
                  {address ? formatAddress(address) : "......"}
                </p>
                <p className="text-sm text-gray-600">
                  {formattedBalance} $SLOT
                </p>
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
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
              0000000
            </div>
            <div className="text-xs text-gray-600">
              CURRENT POOL GAMES PLAYES COUNT
            </div>
          </div>
          <div>
            <div
              className="text-2xl font-bold text-blue-600 animate-pulse"
              style={{ animationDelay: "0.3s" }}
            >
              1/1000
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

      <div className="hidden">
        <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
          <span className="text-sm font-medium">Win Difficulty:</span>
          <div className="flex items-center space-x-2">
            {winDifficulty ? (
              <span className="text-blue-600 font-mono text-sm">
                {winDifficulty.toString()}
              </span>
            ) : (
              <span className="text-gray-500 text-sm">Not loaded</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadWinDifficulty}
              icon={<Icon name="arrow-right" size="sm" />}
            >
              Load
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
