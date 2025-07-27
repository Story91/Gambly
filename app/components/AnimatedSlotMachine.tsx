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
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Animation settings - dostosowane do 5 rzędów
    let text = displayText;
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
    <div className="w-full max-w-md mx-auto"> {/* Zwiększone z max-w-sm na max-w-md */}
      <div className="relative rounded-lg border border-gray-200 overflow-hidden" style={{ height: '200px', width: '100%' }}> {/* Zwiększone z 156px na 200px */}
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
        {/* Decorative frame */}
        <div className="absolute inset-0 border-2 border-blue-300 rounded-lg pointer-events-none"></div>
        {isSpinning && (
          <div className="absolute top-1 right-1 text-blue-500 animate-spin">
            ⭐
          </div>
        )}
      </div>
    </div>
  );
} 