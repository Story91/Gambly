"use client";

import { useState, useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
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
import { CONTRACTS, ERC20_ABI, GAMBLING_CONTRACT_ABI } from "../../lib/contracts";
import { getWinDifficulty, createGamblyWinCall } from "../../lib/gambling-service";
import { checkWin } from "../../lib/random";
import { encodeFunctionData, parseEther } from "viem";

type CardProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

function Card({ title, children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl shadow-lg border border-[var(--app-card-border)] overflow-hidden transition-all hover:shadow-xl ${className}`}
    >
      {title && (
        <div className="px-5 py-3 border-b border-[var(--app-card-border)]">
          <h3 className="text-lg font-medium text-[var(--app-foreground)]">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function GamblingCard() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [winDifficulty, setWinDifficulty] = useState<bigint | null>(null);
  const [lastResult, setLastResult] = useState<{ won: boolean; txHash?: string; claimed?: boolean } | null>(null);
  const [transferAmount, setTransferAmount] = useState("0.001"); // Amount in ETH/tokens to transfer
  
  const sendNotification = useNotification();

  // ERC20 transfer transaction call
  const transferCalls = useMemo(() => {
    if (!address || !transferAmount) return [];
    
    const amount = parseEther(transferAmount);
    
    return [
      {
        to: CONTRACTS.ERC20_ADDRESS,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [CONTRACTS.GAMBLING_ADDRESS, amount],
        }),
        value: BigInt(0),
      },
    ];
  }, [address, transferAmount]);

  // Claim win transaction call
  const claimCalls = useMemo(() => {
    if (!address || !lastResult?.won || lastResult.claimed) return [];
    
    return [createGamblyWinCall(address)];
  }, [address, lastResult]);

  // Load win difficulty from contract
  const loadWinDifficulty = useCallback(async () => {
    try {
      setIsLoading(true);
      const difficulty = await getWinDifficulty();
      setWinDifficulty(difficulty);
      console.log('Loaded win difficulty:', difficulty.toString());
    } catch (error) {
      console.error('Failed to load win difficulty:', error);
      await sendNotification({
        title: "Error",
        body: "Failed to load win difficulty from contract",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sendNotification]);

  // Handle successful ERC20 transfer
  const handleTransferSuccess = useCallback(async (response: TransactionResponse) => {
    const transactionHash = response.transactionReceipts[0].transactionHash;
    console.log(`ERC20 Transfer successful: ${transactionHash}`);

    try {
      setIsLoading(true);
      
      // Get win difficulty if not loaded
      let currentWinDifficulty = winDifficulty;
      if (!currentWinDifficulty) {
        currentWinDifficulty = await getWinDifficulty();
        setWinDifficulty(currentWinDifficulty);
      }

      // Check if user wins
      const userWins = checkWin(currentWinDifficulty, transactionHash);
      
      if (userWins && address) {
        setLastResult({ won: true, txHash: transactionHash });
        
        await sendNotification({
          title: "🎉 Congratulations! You Won!",
          body: `You won the gamble! Now claim your prize!`,
        });
      } else {
        setLastResult({ won: false });
        
        await sendNotification({
          title: "Better luck next time!",
          body: `Transfer completed but you didn't win this round. Try again!`,
        });
      }
    } catch (error) {
      console.error('Error in post-transfer logic:', error);
      await sendNotification({
        title: "Transfer Complete",
        body: "Transfer successful but couldn't check win status.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [winDifficulty, address, sendNotification]);

  // Handle transaction error
  const handleTransferError = useCallback(async (error: TransactionError) => {
    console.error("ERC20 Transfer failed:", error);
    await sendNotification({
      title: "Transfer Failed",
      body: "The ERC20 transfer transaction failed. Please try again.",
    });
  }, [sendNotification]);

  // Handle successful claim
  const handleClaimSuccess = useCallback(async (response: TransactionResponse) => {
    const transactionHash = response.transactionReceipts[0].transactionHash;
    console.log(`Claim successful: ${transactionHash}`);

    setLastResult(prev => prev ? { ...prev, claimed: true, txHash: transactionHash } : null);
    
    await sendNotification({
      title: "🎉 Prize Claimed!",
      body: `Successfully claimed your winnings! TX: ${transactionHash.slice(0, 10)}...`,
    });
  }, [sendNotification]);

  // Handle claim error
  const handleClaimError = useCallback(async (error: TransactionError) => {
    console.error("Claim failed:", error);
    await sendNotification({
      title: "Claim Failed",
      body: "Failed to claim your prize. Please try again.",
    });
  }, [sendNotification]);

  return (
    <Card title="🎲 Gambly - Test Your Luck!">
      <div className="space-y-4">
        <p className="text-[var(--app-foreground-muted)] text-sm">
          Transfer ERC20 tokens to the gambling contract and test your luck! 
          If the random number modulo win difficulty equals 0, you win!
        </p>

        {/* Win Difficulty Display */}
        <div className="flex items-center justify-between p-3 bg-[var(--app-gray)] rounded-lg">
          <span className="text-sm font-medium">Win Difficulty:</span>
          <div className="flex items-center space-x-2">
            {winDifficulty ? (
              <span className="text-[var(--app-accent)] font-mono">
                {winDifficulty.toString()}
              </span>
            ) : (
              <span className="text-[var(--app-foreground-muted)]">Not loaded</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadWinDifficulty}
              disabled={isLoading}
              icon={<Icon name="arrow-right" size="sm" />}
            >
              Load
            </Button>
          </div>
        </div>

        {/* Transfer Amount Input */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium min-w-0 flex-shrink-0">
            Amount:
          </label>
          <input
            type="number"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            step="0.001"
            min="0"
            className="flex-1 px-3 py-2 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--app-accent)]"
            placeholder="0.001"
          />
          <span className="text-sm text-[var(--app-foreground-muted)]">ETH</span>
        </div>

                 {/* Last Result */}
        {lastResult && (
          <div className={`p-3 rounded-lg ${
            lastResult.won 
              ? 'bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700' 
              : 'bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon 
                  name={lastResult.won ? "check" : "heart"} 
                  className={lastResult.won ? "text-green-600" : "text-red-600"} 
                />
                <span className={`text-sm font-medium ${
                  lastResult.won ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                }`}>
                  {lastResult.won ? 
                    (lastResult.claimed ? "🎉 Prize Claimed!" : "🎉 You Won!") : 
                    "Better luck next time!"
                  }
                </span>
              </div>
              
              {/* Claim Button */}
              {lastResult.won && !lastResult.claimed && (
                <Transaction
                  calls={claimCalls}
                  onSuccess={handleClaimSuccess}
                  onError={handleClaimError}
                >
                  <TransactionButton 
                    className="text-white text-xs px-3 py-1" 
                    text="Claim Prize" 
                  />
                </Transaction>
              )}
            </div>
            {lastResult.txHash && (
              <p className="text-xs text-[var(--app-foreground-muted)] mt-1">
                {lastResult.claimed ? "Claim" : "Win"} TX: {lastResult.txHash.slice(0, 20)}...
              </p>
            )}
          </div>
        )}

        {/* Transaction Button */}
        <div className="flex flex-col items-center">
          {address ? (
            <Transaction
              calls={transferCalls}
              onSuccess={handleTransferSuccess}
              onError={handleTransferError}
            >
              <TransactionButton 
                className="text-white text-md w-full" 
                disabled={isLoading || !transferAmount || Number(transferAmount) <= 0}
                text={isLoading ? "Processing..." : "🎲 Gamble!"}
              />
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
            <p className="text-yellow-400 text-sm text-center mt-2">
              Connect your wallet to start gambling
            </p>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-[var(--app-foreground-muted)] space-y-1">
          <p>• ERC20 Contract: {CONTRACTS.ERC20_ADDRESS.slice(0, 10)}...</p>
          <p>• Gambling Contract: {CONTRACTS.GAMBLING_ADDRESS.slice(0, 10)}...</p>
          <p>• Win condition: random % win_difficulty === 0</p>
        </div>
      </div>
    </Card>
  );
} 