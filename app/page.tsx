"use client";

import { useMiniKit, useAddFrame } from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { base } from "viem/chains";

import { GamblingCard } from "./components/GamblingCard";
import { Button, Icon } from "./components/DemoComponents";
import { Leaderboard } from "./components/Leaderboard";
import { Claim } from "./components/Claim";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const { address, isConnected } = useAccount();

  const addFrame = useAddFrame();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 font-mono">
      <div className="w-full max-w-md mx-auto bg-white min-h-screen relative">
        <header className="flex justify-between items-center p-3 bg-white">
          <div className="flex items-center space-x-2">
            <Image
              src="/splash.gif"
              alt="Gambly"
              width={50}
              height={50}
              className="rounded-lg object-cover"
            />
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setShowHowItWorks(true)}
              className="px-2 py-1 border text-black border-gray-300 rounded text-xs font-medium hover:bg-gray-50 font-mono"
            >
              HOW IT WORKS
            </button>
            <Wallet className="z-10">
              <ConnectWallet className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 font-mono border-2 border-blue-800 shadow-md">
                {isConnected && address ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      address={address as `0x${string}`}
                      chain={base}
                    />
                    <Name
                      className="text-xs font-bold truncate"
                      address={address as `0x${string}`}
                      chain={base}
                    >
                      <span className="text-xs font-bold truncate">
                        {formatAddress(address)}
                      </span>
                    </Name>
                  </div>
                ) : (
                  "CONNECT"
                )}
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </header>

        {showHowItWorks && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowHowItWorks(false)}
          >
            <div
              className="bg-white rounded-lg p-6 mx-4 max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold font-mono">HOW IT WORKS</h2>
                <button
                  onClick={() => setShowHowItWorks(false)}
                  className="text-gray-500 hover:text-gray-700 font-mono"
                >
                  ✕
                </button>
              </div>
              <div className="text-center">
                <p className="text-gray-600 mb-4 font-mono">
                  🎰 GAMBLY PAPER 🎰
                </p>
                <div className="text-sm text-gray-500 font-mono space-y-3 text-left">
                  <p>
                    🔥 <strong>GLOBAL POOL:</strong> Every spin adds 100k $SLOT
                    to the jackpot! One winner takes ALL!
                  </p>

                  <p>
                    ⚡ <strong>WINNER TAKES ALL:</strong> When you win, you get
                    the ENTIRE pool! No fixed prizes - pure degen action!
                  </p>

                  <p>
                    🎯 <strong>CHANCE:</strong> Every spin has the same odds.
                    The more people spin, the bigger the prize!
                  </p>

                  <p>
                    🎁 <strong>WELCOME BONUS:</strong> New degens get 100k $SLOT
                    free to start spinning!
                  </p>
                  <p>
                    🎲 <strong>RANDOMNESS:</strong> Each spin uses your
                    transaction hash as a seed for keccak256 hashing. The result
                    modulo the win difficulty determines if you win.
                  </p>
                  <p>
                    🔗 <strong>CONTRACTS:</strong>
                  </p>
                  <div className="text-xs bg-gray-100 p-2 rounded font-mono">
                    <p>$SLOT: 0xbb97f8257cd4ba47ae5c979afcf12eb19d1723e8</p>
                    <p>GAMBLE: 0x7d0CF0F993568c38061942f8Eaaa3B2ec084441B</p>
                    <p>CLAIM: 0xeaded0048371ecc5f93c8cdba0a9c1f147cac695</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="px-2">
          <Claim />
          <GamblingCard />
          <Leaderboard />
        </main>

        {saveFrameButton && (
          <div className="fixed bottom-4 right-4">{saveFrameButton}</div>
        )}
        <footer className="text-center text-xs text-black py-10">
          <p>Gambly</p>
        </footer>
      </div>
    </div>
  );
}
