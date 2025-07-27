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

import { GamblingCard } from "./components/GamblingCard";
import { Button, Icon } from "./components/DemoComponents";
import { Leaderboard } from "./components/Leaderboard";

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
                {isConnected && address ? formatAddress(address) : "CONNECT"}
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
                <p className="text-gray-600 mb-4 font-mono">GAMBLING PAPER</p>
                <div className="text-sm text-gray-500 font-mono">
                  Connect your wallet, set amount, and gamble to win $SLOT
                  tokens!
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="px-2">
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
