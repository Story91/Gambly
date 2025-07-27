"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SlotMachineProps {
  isSpinning: boolean;
  result: "win" | "lose" | null;
  onSpinComplete: () => void;
}

const SYMBOLS = ["🍎", "🍊", "🍇", "🍒", "🍋", "💎", "7️⃣", "🎰"];
const WINNING_COMBINATION = ["7️⃣", "7️⃣", "7️⃣"];

export function SlotMachine({
  isSpinning,
  result,
  onSpinComplete,
}: SlotMachineProps) {
  const [reels, setReels] = useState<string[][]>([
    ["🍎", "🍊", "🍇"],
    ["🍒", "🍋", "💎"],
    ["7️⃣", "🎰", "🍎"],
  ]);

  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout>();

  const generateRandomReels = useCallback((): string[] => {
    return Array.from(
      { length: 3 },
      () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    );
  }, []);

  const startSpinning = useCallback(() => {
    setIsAnimating(true);

    // Animate for 3 seconds
    const spinDuration = 3000;
    const spinInterval = 100; // Change symbols every 100ms

    let spinCount = 0;
    const maxSpins = spinDuration / spinInterval;

    const spin = () => {
      if (spinCount >= maxSpins) {
        // Stop spinning and show final result
        if (result === "win") {
          console.log("Setting win result: 7️⃣7️⃣7️⃣");
          setReels([
            WINNING_COMBINATION,
            WINNING_COMBINATION,
            WINNING_COMBINATION,
          ]);
        } else {
          console.log("Setting lose result: random symbols");
          // For lose, each column should have different symbols
          setReels([
            generateRandomReels(),
            generateRandomReels(),
            generateRandomReels(),
          ]);
        }
        setIsAnimating(false);
        onSpinComplete();
        return;
      }

      // Generate different random symbols for each column during spinning
      setReels([
        generateRandomReels(),
        generateRandomReels(),
        generateRandomReels(),
      ]);

      spinCount++;
      animationRef.current = setTimeout(spin, spinInterval);
    };

    spin();
  }, [result, generateRandomReels, onSpinComplete]);

  useEffect(() => {
    if (isSpinning && !isAnimating) {
      startSpinning();
    }
  }, [isSpinning, isAnimating, startSpinning]);

  // Handle result changes when spinning is complete
  useEffect(() => {
    if (!isAnimating && result) {
      if (result === "win") {
        console.log("Result changed to win, setting 7️⃣7️⃣7️⃣");
        setReels([
          WINNING_COMBINATION,
          WINNING_COMBINATION,
          WINNING_COMBINATION,
        ]);
      } else if (result === "lose") {
        console.log("Result changed to lose, setting random symbols");
        setReels([
          generateRandomReels(),
          generateRandomReels(),
          generateRandomReels(),
        ]);
      }
    }
  }, [result, isAnimating, generateRandomReels]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="relative bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-xl p-6 shadow-2xl border-4 border-yellow-300">
      {/* Slot Machine Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">
          🎰 SLOT MACHINE 🎰
        </h2>
      </div>

      {/* Reels Container */}
      <div className="bg-black rounded-lg p-4 mb-4 border-2 border-yellow-200">
        <div className="flex justify-center space-x-2">
          {reels.map((reel, reelIndex) => (
            <div
              key={reelIndex}
              className={`w-20 h-20 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-yellow-300 flex items-center justify-center text-3xl ${
                isAnimating ? "animate-pulse" : ""
              }`}
            >
              <div
                className={`transform transition-all duration-200 ${
                  isAnimating ? "animate-bounce" : ""
                }`}
              >
                {reel[1]} {/* Show middle symbol */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pay Line */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-64 h-1 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
      </div>

      {/* Status */}
      <div className="text-center">
        {isAnimating ? (
          <div className="text-white font-bold text-lg animate-pulse">
            🎲 SPINNING... 🎲
          </div>
        ) : result === "win" ? (
          <div className="text-green-400 font-bold text-lg animate-bounce">
            🎉 JACKPOT! 🎉
          </div>
        ) : result === "lose" ? (
          <div className="text-red-400 font-bold text-lg">😔 Try Again! 😔</div>
        ) : (
          <div className="text-white font-bold text-lg">Ready to Spin! 🎰</div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-2 left-2 text-yellow-200 text-xl">🎰</div>
      <div className="absolute top-2 right-2 text-yellow-200 text-xl">🎰</div>
      <div className="absolute bottom-2 left-2 text-yellow-200 text-xl">💰</div>
      <div className="absolute bottom-2 right-2 text-yellow-200 text-xl">
        💰
      </div>
    </div>
  );
}
