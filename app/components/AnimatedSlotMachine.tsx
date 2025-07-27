"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedSlotMachineProps {
  isSpinning: boolean;
  result: "win" | "lose" | null;
}

export function AnimatedSlotMachine({ isSpinning, result }: AnimatedSlotMachineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [displayText, setDisplayText] = useState('BASED');
  const [ledAnimation, setLedAnimation] = useState(false);
  
  // LED animations
  useEffect(() => {
    const interval = setInterval(() => {
      setLedAnimation(prev => !prev);
    }, 800);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

         // Animation settings - dostosowane do 5 rzędów
     const text = displayText;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const scale = 32; // Zmniejszone z 50 na 32, żeby zmieścić więcej rzędów
    const breaks = 0.003;
    const endSpeed = 0.05;
    const firstLetter = 220;
    const delay = 40;

    // Setup
    const textArray = text.split('');
    const charsArray = chars.split('');
    const charMap: Record<string, number> = {};
    const offset: number[] = [];
    const offsetV: number[] = [];

    // Create character map
    for (let i = 0; i < charsArray.length; i++) {
      charMap[charsArray[i]] = i;
    }

    // Initialize offsets
    for (let i = 0; i < textArray.length; i++) {
      const f = firstLetter + delay * i;
      offsetV[i] = endSpeed + breaks * f;
      offset[i] = -(1 + f) * (breaks * f + 2 * endSpeed) / 2;
    }

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();

    // Animation loop
    const loop = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      
      // Background dla całego canvas
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Niebieski pasek w środku (główny rząd)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (result === 'win') {
        gradient.addColorStop(0, '#10B981');
        gradient.addColorStop(1, '#059669');
      } else if (result === 'lose') {
        gradient.addColorStop(0, '#EF4444');
        gradient.addColorStop(1, '#DC2626');
      } else {
        gradient.addColorStop(0, '#3B82F6');
        gradient.addColorStop(1, '#1E40AF');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, (canvas.height - scale) / 2, canvas.width, scale);

      // Litery - 5 rzędów widocznych
      for (let i = 0; i < textArray.length; i++) {
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.setTransform(
          1, 0, 0, 1,
          Math.floor((canvas.width - scale * (textArray.length - 1)) / 2),
          Math.floor(canvas.height / 2)
        );
        
        let o = offset[i];
        while (o < 0) o++;
        o %= 1;
        
        // Rysujemy dokładnie 5 rzędów: -2, -1, 0 (główny), 1, 2
        for (let j = -2; j <= 2; j++) {
          let c = charMap[textArray[i]] + j - Math.floor(offset[i]);
          while (c < 0) c += charsArray.length;
          c %= charsArray.length;
          
          // Alpha fading - główny rząd (j+o≈0) ma alpha=1, inne mniejsze
          const distance = Math.abs(j + o);
          let s;
          if (distance < 0.1) {
            s = 1; // Główny rząd - pełna przezroczystość
          } else if (distance < 1) {
            s = 0.7; // Sąsiednie rzędy
          } else {
            s = 0.4; // Skrajne rzędy
          }
          
          ctx.globalAlpha = s;
          ctx.font = scale * s + 'px Helvetica';
          ctx.fillText(charsArray[c], scale * i, (j + o) * scale);
        }
        
        // Aktualizacja offsets tylko gdy spinning
        if (isSpinning) {
          offset[i] += offsetV[i];
          offsetV[i] -= breaks;
          if (offsetV[i] < endSpeed) {
            offset[i] = 0;
            offsetV[i] = 0;
          }
        }
      }
      
      if (isSpinning) {
        animationRef.current = requestAnimationFrame(loop);
      } else {
        // Gdy nie spinning, pokaż finalne litery
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Niebieski pasek
        ctx.fillStyle = gradient;
        ctx.fillRect(0, (canvas.height - scale) / 2, canvas.width, scale);
        
        // Finalne litery - pokazuj wszystkie 5 rzędów
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        const totalWidth = scale * (textArray.length - 1);
        const startX = (canvas.width - totalWidth) / 2;
        
        // Rysuj 5 rzędów
        for (let j = -2; j <= 2; j++) {
          for (let i = 0; i < textArray.length; i++) {
            let c = charMap[textArray[i]] + j;
            while (c < 0) c += charsArray.length;
            c %= charsArray.length;
            
            // Alpha dla różnych rzędów
            let alpha, fontSize;
            if (j === 0) {
              alpha = 1;
              fontSize = scale;
            } else if (Math.abs(j) === 1) {
              alpha = 0.7;
              fontSize = scale * 0.7;
            } else {
              alpha = 0.4;
              fontSize = scale * 0.4;
            }
            
            ctx.globalAlpha = alpha;
            ctx.font = `${fontSize}px Helvetica`;
            ctx.fillText(charsArray[c], startX + scale * i, canvas.height / 2 + j * scale);
          }
        }
      }
    };

    // Rozpocznij animację
    loop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, result, displayText]);

  // Update text based on result
  useEffect(() => {
    if (result === 'win') {
      setDisplayText('BASED');
    } else if (result === 'lose') {
      setDisplayText('BASED');
    } else {
      setDisplayText('BASED');
    }
  }, [result]);

  return (
    <div className="w-full max-w-md mx-auto">
             {/* Casino Frame */}
       <div className="relative bg-gradient-to-b from-blue-600 via-blue-500 to-blue-700 rounded-xl p-4 shadow-xl border-2 border-blue-400">

        {/* Side Elements */}
        <div className="flex items-center gap-3">
          
          {/* Left Panel */}
          <div className="w-6 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-2 border border-gray-600">
            {/* Mini LED Strip */}
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1 h-1 rounded-full ${
                    ledAnimation ? 'bg-red-500' : 'bg-red-800'
                  } transition-colors duration-500`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          </div>

          {/* Main Slot Area */}
          <div className="flex-1 relative">
                         {/* Decorative Frame */}
             <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400 rounded-lg"></div>
             <div className="absolute -inset-1 bg-gradient-to-r from-gray-800 via-gray-600 to-gray-800 rounded-lg"></div>
            
            {/* Payline Indicators */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-4">
              <div className={`w-3 h-px bg-red-500 rounded ${isSpinning ? 'animate-pulse' : ''}`}></div>
            </div>
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4">
              <div className={`w-3 h-px bg-red-500 rounded ${isSpinning ? 'animate-pulse' : ''}`}></div>
            </div>
            
            {/* Slot Canvas */}
            <div className="relative z-10 rounded-lg overflow-hidden" style={{ height: '200px' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  display: 'block',
                  backgroundColor: '#111'
                }}
              />
              
              {/* Win Celebration Overlay */}
              {result === 'win' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                  <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
                    <div className="text-yellow-300 font-bold text-xl animate-pulse flex items-center space-x-2">
                      <span className="animate-bounce">🎉</span>
                      <span>JACKPOT!</span>
                      <span className="animate-bounce">🎉</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Just LED Strip */}
          <div className="w-6 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg p-2 border border-gray-600">
            {/* Mini LED Strip */}
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1 h-1 rounded-full ${
                    ledAnimation ? 'bg-blue-500' : 'bg-blue-800'
                  } transition-colors duration-500`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        

                 {/* Decorative Bottom LED Strip */}
         <div className="absolute -bottom-1 left-2 right-2 h-2 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-b-lg">
          <div className="flex justify-center items-center h-full space-x-2">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className={`w-px h-px rounded-full ${
                  i % 2 === 0 ? 'bg-red-600' : 'bg-blue-600'
                } animate-pulse`}
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 