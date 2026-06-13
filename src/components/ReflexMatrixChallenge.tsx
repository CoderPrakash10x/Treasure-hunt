import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Timer, RefreshCw, Eye, Target } from "lucide-react";

interface Cell {
  value: number;
  clicked: boolean;
}

interface ReflexMatrixChallengeProps {
  onSuccess: () => void;
}

const TIME_LIMIT = 12.0;

export default function ReflexMatrixChallenge({ onSuccess }: ReflexMatrixChallengeProps) {
  const [numbers, setNumbers] = useState<Cell[]>([]);
  const [nextExpectedNumber, setNextExpectedNumber] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(TIME_LIMIT); // 12.0 seconds
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [flashType, setFlashType] = useState<"error" | "timeout" | "success" | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to generate a scrambled grid of numbers from 1 to 16
  const generateScrambledGrid = (): Cell[] => {
    const list: number[] = Array.from({ length: 16 }, (_, i) => i + 1);
    // Shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list.map((val) => ({
      value: val,
      // If we are resetting, all cells are unclicked
      clicked: false,
    }));
  };

  // Reset the challenge completely
  const resetChallenge = (type: "error" | "timeout") => {
    setNextExpectedNumber(1);
    setTimeLeft(TIME_LIMIT);
    setNumbers(generateScrambledGrid());
    
    if (type === "error") {
      setFlashMessage("❌ WRONG ORDER! MATRIX RESHUFFLING...");
      setFlashType("error");
    } else {
      setFlashMessage("⏳ OUT OF TIME! MATRIX RESETTING...");
      setFlashType("timeout");
    }

    // Clear flash message after 2 seconds
    setTimeout(() => {
      setFlashMessage(null);
      setFlashType(null);
    }, 2000);
  };

  // Initial generation
  useEffect(() => {
    setNumbers(generateScrambledGrid());
  }, []);

  // Timer interval loop - using precise 100ms interval for fluid progress bar transition
  useEffect(() => {
    // If matrix is completed, do not run timer
    if (nextExpectedNumber > 16) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          // Timeout triggers
          resetChallenge("timeout");
          return TIME_LIMIT;
        }
        return Number((prev - 0.1).toFixed(2));
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextExpectedNumber]);

  // Handle cell clicking
  const handleCellClick = (clickedVal: number, index: number) => {
    if (nextExpectedNumber > 16) return; // already finished
    
    // Check if clicked val matches next expected number
    if (clickedVal === nextExpectedNumber) {
      // Mark as clicked
      const updated = [...numbers];
      updated[index].clicked = true;
      setNumbers(updated);

      const nextVal = nextExpectedNumber + 1;
      setNextExpectedNumber(nextVal);

      // Check for absolute success of completing all 16 values
      if (nextVal > 16) {
        if (timerRef.current) clearInterval(timerRef.current);
        setFlashMessage("⚡ CALIBRATION COMPLETE! ADVANCING...");
        setFlashType("success");
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } else {
      // Wrong click triggers error penalty
      resetChallenge("error");
    }
  };

  // Percentage of timer remaining
  const timerPercentage = (timeLeft / TIME_LIMIT) * 100;
  const isTimeLow = timeLeft < 4.0;

  return (
    <div id="reflex-matrix-wrapper" className="w-full max-w-lg mx-auto flex flex-col gap-5 p-1">
      
      {/* Target and Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-coral/10 border border-coral/30 rounded-lg">
            <Target className="w-5 h-5 text-coral animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Current Objective</div>
            <div className="text-sm font-semibold text-slate-200">
              {nextExpectedNumber <= 16 ? (
                <span>Click numbers sequentially <b className="text-coral font-mono">1 ➔ 16</b></span>
              ) : (
                <span className="text-emerald-400">Calibration Lock Standardized</span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic target badge with nice cyber styled layout */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase text-slate-400">Next Target:</span>
          <span id="reflex-target-badge" className="px-3 py-1 font-mono text-lg font-bold bg-coral/10 border border-coral/40 rounded-lg text-coral shadow-[0_0_12px_rgba(255,111,97,0.3)] min-w-[36px] text-center">
            {nextExpectedNumber <= 16 ? nextExpectedNumber : "✓"}
          </span>
        </div>
      </div>

      {/* Visual countdown progress bar */}
      <div id="timer-bar-container" className="space-y-1.5 animate-fade-in">
        <div className={`flex items-end justify-between font-mono text-xs p-1 rounded-lg transition-all duration-300 ${
          isTimeLow 
            ? "text-rose-400 bg-rose-500/5 animate-[blink_1s_infinite] shadow-[inset_0_0_10px_rgba(239,68,68,0.05)] border border-rose-500/10" 
            : "text-coral bg-coral/5 border border-coral/5"
        }`}>
          <div className="flex items-center gap-1.5">
            <Timer className={`w-3.5 h-3.5 transition-colors ${isTimeLow ? "text-rose-400" : "text-coral"}`} />
            <span className="text-[10px] tracking-widest uppercase font-bold">NEURAL SYNCHRONIZATION</span>
          </div>
          <span id="timer-countdown-text" className={`text-xl font-mono font-bold transition-all ${isTimeLow ? "text-rose-400 text-shadow-[0_0_8px_#f43f5e]" : "text-coral"}`}>
            {timeLeft.toFixed(2)}s
          </span>
        </div>
        
        {/* Progress Bar Container */}
        <div className={`w-full h-3 bg-slate-950 rounded-full overflow-hidden p-[2px] border transition-all duration-300 ${
          isTimeLow
            ? "border-rose-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            : "border-coral/25 shadow-[0_0_8px_rgba(255,111,97,0.15)]"
        }`}>
          <div
            id="reflex-timer-progress-bar"
            style={{ width: `${timerPercentage}%` }}
            className={`h-full rounded-full transition-all duration-100 ease-linear ${
              isTimeLow
                ? "bg-rose-500 shadow-[0_0_12px_#ef4444]"
                : "bg-coral shadow-[0_0_10px_#ff6f61]"
            }`}
          />
        </div>
      </div>

      {/* Flashing Banner Notification Overlay */}
      <div className="h-6 relative">
        <AnimatePresence mode="wait">
          {flashMessage && (
            <motion.div
              key={flashMessage}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`text-center text-xs font-mono font-bold py-0.5 px-3 rounded border text-ellipsis overflow-hidden ${
                flashType === "error"
                  ? "bg-rose-950/40 border-rose-800/80 text-rose-300"
                  : flashType === "timeout"
                    ? "bg-amber-950/40 border-amber-800/80 text-amber-300"
                    : "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
              }`}
            >
              {flashMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Shuffled 4x4 Reflex Grid Matrix */}
      <div
        id="reflex-4x4-grid"
        className="grid grid-cols-4 gap-2 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl relative shadow-inner shadow-coral/10"
      >
        {/* Subtle decorative grid cells or technical text */}
        <div className="absolute top-1 left-2 pointer-events-none text-[8px] font-mono text-slate-700 select-none">
          CALIBRATION_LOOP_v4.7
        </div>
        <div className="absolute bottom-1 right-2 pointer-events-none text-[8px] font-mono text-slate-700 select-none">
          SYS_PING_OK
        </div>

        {numbers.map((cell, idx) => {
          const isTarget = cell.value === nextExpectedNumber;
          return (
            <motion.button
              key={`${idx}-${cell.value}`}
              id={`reflex-cell-${cell.value}`}
              onClick={() => handleCellClick(cell.value, idx)}
              disabled={cell.clicked || nextExpectedNumber > 16}
              whileHover={!cell.clicked ? { scale: 1.05 } : {}}
              whileTap={!cell.clicked ? { scale: 0.95 } : {}}
              className={`h-14 sm:h-16 rounded-xl font-mono text-xl font-bold border flex items-center justify-center select-none transition-all duration-200 cursor-pointer ${
                cell.clicked
                  ? "bg-[#0c1425] border border-coral text-coral shadow-[inset_0_0_15px_rgba(255,111,97,0.2)] cursor-default opacity-80"
                  : isTarget
                    ? "bg-[#1e293b] border-2 border-coral text-white shadow-[0_0_20px_rgba(255,111,97,0.5)] hover:bg-coral/10"
                    : "bg-[#0c1425] border border-white/10 text-slate-500 hover:border-coral/50 hover:text-slate-300"
              }`}
            >
              {String(cell.value).padStart(2, "0")}
            </motion.button>
          );
        })}
      </div>

      <div className="text-center font-sans text-xs text-slate-500">
        Tip: Focus your attention on the coordinates. Redundant wrong clicks will trigger immediate reshuffle and penalty restart!
      </div>
    </div>
  );
}
