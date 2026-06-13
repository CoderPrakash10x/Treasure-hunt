import React, { useState } from "react";
import { motion } from "motion/react";

interface KeypadItem {
  num: string;
  letters: string;
}

export default function PhoneKeypad() {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const keys: KeypadItem[] = [
    { num: "1", letters: " " },
    { num: "2", letters: "ABC" },
    { num: "3", letters: "DEF" },
    { num: "4", letters: "GHI" },
    { num: "5", letters: "JKL" },
    { num: "6", letters: "MNO" },
    { num: "7", letters: "PQRS" },
    { num: "8", letters: "TUV" },
    { num: "9", letters: "WXYZ" },
    { num: "*", letters: "" },
    { num: "0", letters: "+" },
    { num: "#", letters: "" },
  ];

  return (
    <div id="phone-keypad-container" className="bg-[#0c1425] border border-coral/20 p-5 rounded-2xl max-w-xs mx-auto shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Glossy terminal scanline overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(255,111,97,0.02)_50%)] bg-[length:100%_4px] pointer-events-none" />
      
      <div className="text-center mb-4">
        <span className="font-mono text-xs text-coral tracking-widest uppercase">Decryption Assistant Terminal</span>
        <div className="h-[2px] w-12 bg-coral mx-auto mt-1 rounded-full shadow-[0_0_10px_#ff6f61]" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <motion.button
            key={k.num}
            id={`keypad-btn-${k.num === "*" ? "star" : k.num === "#" ? "hash" : k.num}`}
            whileTap={{ scale: 0.95 }}
            onMouseDown={() => setActiveKey(k.num)}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            onTouchStart={() => setActiveKey(k.num)}
            onTouchEnd={() => setActiveKey(null)}
            className={`flex flex-col items-center justify-center h-16 rounded-xl border font-sans select-none transition-all duration-150 cursor-pointer ${
              activeKey === k.num
                ? "bg-coral/20 border-coral text-coral outline-none shadow-[0_0_15px_rgba(255,111,97,0.4)]"
                : "bg-[#050b18] border-coral/20 hover:border-coral/50 hover:bg-coral/5 text-slate-100"
            }`}
          >
            <span className="text-xl font-bold font-mono tracking-tight">{k.num}</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-widest h-3">
              {k.letters}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="mt-4 bg-[#050b18] border border-coral/10 rounded-lg p-2 text-center text-xs text-slate-400">
        <span className="font-mono text-[11px]">
          Multi-tap tip: <b className="text-coral">33</b> is <b className="text-emerald-400 font-bold">E</b>, <b className="text-coral">777</b> is <b className="text-emerald-400 font-bold">R</b>
        </span>
      </div>
    </div>
  );
}
