import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Compass, Anchor, MapPin, CheckCircle, Ship } from "lucide-react";

interface PosterTile {
  id: number;
  correctIndex: number;
  row: number;
  col: number;
  imgUrl: string;
}

interface SecretEscapeChallengeProps {
  onSuccess: () => void;
}

export default function SecretEscapeChallenge({ onSuccess }: SecretEscapeChallengeProps) {
  const [board, setBoard] = useState<PosterTile[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});

  const tilesList: PosterTile[] = Array.from({ length: 9 }, (_, i) => {
    const r = Math.floor(i / 3) + 1;
    const c = (i % 3) + 1;
    return {
      id: i,
      correctIndex: i,
      row: r,
      col: c,
      imgUrl: `/assets/level8/poster_row${r}_col${c}.png`,
    };
  });

  const initBoard = () => {
    let scrambled = [...tilesList];
    let isWinning = true;

    // Use a robust random shuffle algorithm and make sure it does not end up in winning state on load
    while (isWinning) {
      for (let i = scrambled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
      }
      isWinning = scrambled.every((tile, idx) => tile.correctIndex === idx);
    }

    setBoard(scrambled);
    setSelectedIdx(null);
    setIsSolved(false);
  };

  useEffect(() => {
    initBoard();
  }, []);

  const handleTileClick = (index: number) => {
    if (isSolved) return;

    if (selectedIdx === null) {
      setSelectedIdx(index);
    } else {
      if (selectedIdx === index) {
        setSelectedIdx(null);
        return;
      }

      // Swap elements
      const newBoard = [...board];
      const temp = newBoard[selectedIdx];
      newBoard[selectedIdx] = newBoard[index];
      newBoard[index] = temp;

      setBoard(newBoard);
      setSelectedIdx(null);

      // Evaluate win constraint
      const won = newBoard.every((tile, idx) => tile.correctIndex === idx);
      if (won) {
        setIsSolved(true);
        // Delay parent success trigger for visual completion animation
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    }
  };

  const handleImageError = (correctIndex: number) => {
    setImageErrors((prev) => ({ ...prev, [correctIndex]: true }));
  };

  // Renders a high-tech pirate map coordinate box if local slices aren't imported yet
  const renderFallbackTile = (tile: PosterTile) => {
    // Generate styled graphics representing map slices
    const isAnchor = tile.correctIndex === 0 || tile.correctIndex === 2 || tile.correctIndex === 8;
    const isCenter = tile.correctIndex === 4;

    return (
      <div className="w-full h-full bg-[#050b18] border border-cyan-500/10 flex flex-col justify-between p-2 relative overflow-hidden select-none">
        {/* Decorative corner grid marks */}
        <span className="absolute top-0.5 left-0.5 text-[6px] text-cyan-500/40 font-mono">
          R{tile.row}C{tile.col}
        </span>

        {isAnchor ? (
          <div className="flex-grow flex flex-col items-center justify-center p-1 space-y-1">
            <Anchor className="w-6 h-6 text-coral/75 animate-pulse" />
            <span className="text-[7px] text-coral/50 font-mono tracking-tighter uppercase">ANCHOR POINT</span>
          </div>
        ) : isCenter ? (
          <div className="flex-grow flex flex-col items-center justify-center p-1 space-y-1">
            <Compass className="w-7 h-7 text-amber-500 animate-spin" style={{ animationDuration: "12s" }} />
            <span className="text-[7px] text-amber-500/60 font-mono uppercase font-black">LOG_NEEDLE</span>
          </div>
        ) : (
          <div className="flex-grow flex flex-col justify-between p-1">
            <div className="flex justify-between items-start">
              <Ship className="w-4 h-4 text-emerald-500/40" />
              <MapPin className="w-3 h-3 text-cyan-400/40" />
            </div>
            <div className="border-t border-dashed border-cyan-500/20 pt-1 flex justify-between text-[6px] text-slate-500 font-mono">
              <span>LAT_GRID_0{tile.correctIndex}</span>
              <span>WST_UPLINK</span>
            </div>
          </div>
        )}

        {/* Diagonal styling grid lines */}
        <div className="absolute inset-0 border border-cyan-500/5 pointer-events-none" />
      </div>
    );
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Interactive Poster Box */}
      <div className="relative bg-slate-950/70 border border-coral/20 rounded-2xl p-4 shadow-xl">
        {/* Glow behind solved grid */}
        <AnimatePresence>
          {isSolved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-coral/5 rounded-2xl filter blur-xl pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* 3x3 interactive puzzle grid */}
        <div
          className={`grid grid-cols-3 gap-2 relative bg-slate-950/80 p-2 rounded-xl transition-all duration-500 ${
            isSolved ? "border border-coral p-0 gap-0" : ""
          }`}
        >
          {board.map((tile, idx) => {
            const isClickable = !isSolved;
            const isSelected = selectedIdx === idx;
            const isCorrect = tile.correctIndex === idx;
            const hasError = imageErrors[tile.correctIndex];

            return (
              <motion.div
                key={tile.id}
                layoutId={`poster-tile-${tile.id}`}
                onClick={() => handleTileClick(idx)}
                className={`aspect-square relative cursor-pointer group rounded-lg overflow-hidden transition-all duration-300 select-none ${
                  isSolved
                    ? "rounded-none border-0"
                    : isSelected
                    ? "ring-2 ring-coral ring-offset-2 ring-offset-slate-950 z-20 scale-102 shadow-[0_0_20px_rgba(255,111,97,0.5)]"
                    : "border border-slate-800 hover:border-coral/50"
                }`}
                whileHover={{ scale: isSolved ? 1 : 1.02 }}
                whileTap={{ scale: isSolved ? 1 : 0.98 }}
              >
                {!hasError ? (
                  <img
                    src={tile.imgUrl}
                    alt={`${tile.imgUrl}`}
                    onError={() => handleImageError(tile.correctIndex)}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                ) : (
                  renderFallbackTile(tile)
                )}

                {/* Swap visual triggers */}
                {!isSolved && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#050b18]/45 transition-all text-[8px] font-mono text-coral/80 pointer-events-none select-none">
                    <span>SELECT [{tile.correctIndex}]</span>
                  </div>
                )}

                {/* Mini correct indicator dot */}
                {!isSolved && isCorrect && (
                  <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-coral rounded-full shadow-[0_0_4px_#ff6f61]" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Unified Solved Success Overlay */}
        <AnimatePresence>
          {isSolved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="absolute inset-0 bg-slate-950/95 border border-coral/40 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4"
            >
              {/* Spinning success indicator */}
              <div className="p-3 bg-coral/10 border border-coral/40 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,111,97,0.35)]">
                <CheckCircle className="w-8 h-8 text-coral animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[9px] text-coral tracking-widest uppercase font-bold block">
                  MAP PIECES RECONSTRUCTED
                </span>
                <h3 className="text-sm font-black text-slate-100 uppercase font-mono leading-tight">
                  Escape Route to the Nexus Unlocked!
                </h3>
              </div>

              <div className="w-full bg-[#050b18] border border-coral/30 rounded-xl p-3 relative overflow-hidden">
                <span className="text-[8px] text-slate-500 block tracking-widest font-mono font-bold">
                  ROUTE ENCRYPTED KEYPASSPHRASE
                </span>
                <span className="text-xl font-black text-coral font-mono tracking-widest mt-1 block select-all animate-pulse drop-shadow-[0_0_6px_rgba(255,111,97,0.3)]">
                  IGNITIA NEXUS
                </span>
              </div>

              <p className="text-[9px] text-slate-400 max-w-[240px] leading-normal font-sans">
                Anchors assembled successfully! The pathway coordinates to Kipm Innovators Foundation are securely mapped.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Styled control menu */}
      <div className="flex items-center justify-between gap-4 px-1 font-mono text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-500 select-none">
          <Compass className="w-3.5 h-3.5 text-coral animate-spin" style={{ animationDuration: "12s" }} />
          <span>ASSEMBLE PIECES CHRONOLOGICALLY</span>
        </div>

        {!isSolved && (
          <button
            type="button"
            onClick={initBoard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050b18] hover:bg-coral/10 border border-coral/30 rounded-lg text-coral hover:text-coral/80 font-bold tracking-wider transition-all cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-coral" />
            <span>RESET MAP</span>
          </button>
        )}
      </div>
    </div>
  );
}
