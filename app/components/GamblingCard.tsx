"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useEnsAvatar } from "wagmi";
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
import {
  getWinDifficulty,
  callGamblyWinAsOwner,
} from "../../lib/gambling-service";
import { checkWin } from "../../lib/random";
import { encodeFunctionData, parseEther, formatUnits } from "viem";
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
      } catch (error) {
        console.error("Blockies error:", error);
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
      } catch (error) {
        setAvatarSrc("/splash.gif");
      }
    } else {
      setAvatarSrc("/splash.gif");
    }
  };

  return (
    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center overflow-hidden">
      {avatarSrc ? (
        <img 
          src={avatarSrc} 
          alt="Avatar" 
          className="w-full h-full rounded-full object-cover"
          onError={handleAvatarError}
        />
      ) : (
        <span className="text-white font-bold text-xs">0x</span>
      )}
    </div>
  );
}

// Letter Grid Component
function LetterGrid({ isSpinning, result }: { isSpinning: boolean; result: "win" | "lose" | null }) {
  const letters = [
    ['F', 'N', 'E', 'J'],
    ['A', 'G', 'D', 'C'],
    ['B', 'A', 'S', 'E'],
    ['A', 'G', 'D', 'C'],
    ['F', 'N', 'E', 'J']
  ];

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="grid grid-cols-4 gap-1 p-4 bg-gray-100 rounded-lg border">
        {letters.map((row, rowIndex) => 
          row.map((letter, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                h-12 w-12 flex items-center justify-center text-xl font-bold rounded
                ${rowIndex === 2 ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}
                ${isSpinning ? 'animate-pulse' : ''}
                ${result === 'win' && rowIndex === 2 ? 'animate-bounce' : ''}
              `}
            >
              {letter}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function GamblingCard() {
  const { address } = useAccount();
  const [winDifficulty, setWinDifficulty] = useState<bigint | null>(null);
  const [lastResult, setLastResult] = useState<{
    won: boolean;
    txHash?: string;
    claimed?: boolean;
  } | null>(null);
  const [transferAmount, setTransferAmount] = useState("100");
  const [transactionKey, setTransactionKey] = useState(0);
  const [claimedBonus, setClaimedBonus] = useState(false);

  // Slot machine states
  const [isSlotSpinning, setIsSlotSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState<"win" | "lose" | null>(null);

  const sendNotification = useNotification();

  // Read token balance from contract
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.ERC20_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
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
    } catch (error) {
      return "$$$";
    }
  }, [tokenBalance]);

  // ERC20 transfer transaction call
  const transferCalls = useMemo(() => {
    if (!address || !transferAmount) return [];

    const amount = parseEther(transferAmount);

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
  }, [address, transferAmount]);

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

      // Get win difficulty if not loaded
      let currentWinDifficulty = winDifficulty;
      if (!currentWinDifficulty) {
        try {
          currentWinDifficulty = await getWinDifficulty();
          setWinDifficulty(currentWinDifficulty);
        } catch (error) {
          console.error("Failed to load win difficulty:", error);
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
            txHash: transactionHash,
            claimed: true,
          });

          // Refetch balance after claiming prize
          refetchBalance();

          await sendNotification({
            title: "🎉 Congratulations! You Won!",
            body: `You won the gamble! Prize automatically claimed! TX: ${claimTxHash.slice(0, 10)}...`,
          });
        } catch (error) {
          console.error("Failed to automatically claim prize:", error);
          setLastResult({ won: true, txHash: transactionHash });

          await sendNotification({
            title: "🎉 Congratulations! You Won!",
            body: `You won the gamble! Prize claim failed. Please try again.`,
          });
        }
      } else {
        setLastResult({ won: false });

        await sendNotification({
          title: "Better luck next time!",
          body: `Transfer completed but you didn't win this round. Try again!`,
        });
      }

      // Reset transaction component to show gamble button again
      setTransactionKey((prev) => prev + 1);
    },
    [winDifficulty, address, sendNotification, refetchBalance],
  );

  // Handle transaction error
  const handleTransferError = useCallback(
    async (error: TransactionError) => {
      console.error("ERC20 Transfer failed:", error);
      setIsSlotSpinning(false);
      setSlotResult(null);
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
      {/* Welcome Bonus */}
      {!claimedBonus && (
        <div className="bg-blue-600 text-white p-4 rounded-lg">
          <p className="text-sm mb-2">Oh, it's your first time, we have a gift.</p>
          <p className="text-sm mb-3">Just, claim and thank us later :)</p>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">1000 $SLOT</span>
            <button 
              onClick={() => setClaimedBonus(true)}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300"
            >
              CLAIM
            </button>
          </div>
        </div>
      )}

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
            <p className="font-medium">{address ? formatAddress(address) : "......"}</p>
            <p className="text-sm text-gray-600">{formattedBalance} $SLOT</p>
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
          <span>0 SPINS</span>
          <span>0 WINS</span>
        </div>
      </div>

      {/* Machine Balance */}
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-600 mb-1">............. $SLOT</div>
        <div className="text-sm text-gray-600 mb-4">MACHINE BALANCE</div>
        
        <div className="flex justify-between text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">0000000</div>
            <div className="text-xs text-gray-600">CURRENT POOL GAMES PLAYES COUNT</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">1/1000</div>
            <div className="text-xs text-gray-600">CURRENT WIN CHANCE</div>
          </div>
        </div>
      </div>

      {/* Letter Grid */}
      <LetterGrid isSpinning={isSlotSpinning} result={slotResult} />

      {/* Gamble Button */}
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
                  setSlotResult(null);
                }
              }}
            >
              <TransactionButton
                className="bg-blue-600 text-white text-lg font-bold py-4 px-12 rounded-lg w-full hover:bg-blue-700"
                disabled={!transferAmount || Number(transferAmount) <= 0}
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

      {/* Amount Input */}
      <div className="flex items-center space-x-2 px-4">
        <label className="text-sm font-medium">Amount:</label>
        <input
          type="number"
          value={transferAmount}
          onChange={(e) => setTransferAmount(e.target.value)}
          step="0.001"
          min="0"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="100"
        />
        <span className="text-sm text-gray-500">WEI</span>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="font-bold text-lg mb-3">LEADERBOARD</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium border-b pb-2">
            <span>#</span>
            <span>address</span>
            <span>total won ($SLOT)</span>
            <span>spins/win ratio</span>
          </div>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex justify-between text-sm p-2 rounded">
              <span className="w-6 h-6 flex items-center justify-center rounded text-white bg-blue-500">
                {i + 1}
              </span>
              <span className="text-xs">0x...</span>
              <span>$$$</span>
              <span>0/0</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Result */}
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
            <p className="text-xs text-gray-500 mt-1">
              TX: {lastResult.txHash.slice(0, 20)}...
            </p>
          )}
        </div>
      )}

      {/* Win Difficulty (Hidden/Debug) */}
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
