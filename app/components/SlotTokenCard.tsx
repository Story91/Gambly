"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useReadContract, useWalletClient, usePublicClient } from "wagmi";
import { useNotification } from "@coinbase/onchainkit/minikit";
import { createFlaunch, ReadWriteFlaunchSDK } from "@flaunch/sdk";
import { CONTRACTS, ERC20_ABI } from "../../lib/contracts";
import { formatUnits, parseEther } from "viem";
import Image from "next/image";

export function SlotTokenCard() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Swap modal states
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapView, setSwapView] = useState<"buy" | "sell" | "alternative">("buy");

  // Flaunch SDK states
  const [buyAmount, setBuyAmount] = useState("0.01");
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
      const metadata = await flaunchSDK.getCoinMetadata(CONTRACTS.ERC20_ADDRESS);
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

  // Read token balance from contract
  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.ERC20_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
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
    } catch {
      return "$$$";
    }
  }, [tokenBalance]);

  const sendNotification = useNotification();

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

        // Clear transaction hash after successful purchase
        setTimeout(() => {
          setTransactionHash(null);
        }, 5000);
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

  if (!address) return null;

  return (
    <div className="space-y-4">
      {/* SLOT Token Metadata Card */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {coinMetadata?.image && (
              <img
                src={coinMetadata.image}
                alt={coinMetadata.symbol}
                className="w-12 h-12 rounded-full border-2 border-green-300"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎰</span>
                <h3 className="text-lg font-bold text-green-800">
                  {coinMetadata?.name || "SLOT Token"}
                </h3>
              </div>
              <p className="text-sm text-green-600">
                Symbol: {coinMetadata?.symbol || "SLOT"}
              </p>
              <p className="text-xs text-green-500">
                Gambly Slot Utility Token
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-green-700">Your Balance</p>
            <p className="text-lg font-bold text-green-800">{formattedBalance} $SLOT</p>
          </div>
        </div>
        
        {/* Quick Buy Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              setBuyAmount("0.0001");
              buyWithETH();
            }}
            disabled={isLoading || !flaunchSDK || !address}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
              ) : (
                <>
                  <div className="flex justify-center mb-1">
                    <Image src="/eth.svg" alt="ETH" width={16} height={16} className="filter brightness-0 invert" />
                  </div>
                  <div>0.0001</div>
                </>
              )}
            </div>
          </button>
          <button
            onClick={() => {
              setBuyAmount("0.001");
              buyWithETH();
            }}
            disabled={isLoading || !flaunchSDK || !address}
            className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
              ) : (
                <>
                  <div className="flex justify-center mb-1">
                    <Image src="/eth.svg" alt="ETH" width={16} height={16} className="filter brightness-0 invert" />
                  </div>
                  <div>0.001</div>
                </>
              )}
            </div>
          </button>
          <button
            onClick={() => {
              setBuyAmount("0.01");
              buyWithETH();
            }}
            disabled={isLoading || !flaunchSDK || !address}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:from-purple-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-center">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
              ) : (
                <>
                  <div className="flex justify-center mb-1">
                    <Image src="/eth.svg" alt="ETH" width={16} height={16} className="filter brightness-0 invert" />
                  </div>
                  <div>0.01</div>
                </>
              )}
            </div>
          </button>
        </div>
        
        {/* Quick Buy Info - horizontal layout */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-600">Quick Buy $SLOT</p>
          <a
            href="https://flaunch.gg/base/coin/0xbb97f8257cd4ba47ae5c979afcf12eb19d1723e8"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Image src="/flaunch.png" alt="Flaunch" width={14} height={14} />
            <span>View on Flaunch</span>
            <span>↗️</span>
          </a>
        </div>
        
        {/* Transaction Status */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">⏳</span>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Processing Purchase...
                </p>
                <p className="text-xs text-blue-600">
                  Please wait while we process your transaction
                </p>
              </div>
            </div>
          </div>
        )}
        
        {transactionHash && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <div>
                <p className="text-sm font-medium text-green-800">
                  Purchase Successful!
                </p>
                <a
                  href={`https://basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline"
                >
                  View on BaseScan: {transactionHash.slice(0, 10)}...
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

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