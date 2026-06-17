import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Terminal, Server, Shield, Radio, Sparkles, Binary, LogIn } from "lucide-react";

interface MatrixIntroOverlayProps {
  onComplete: () => void;
  user: any;
  onLogin: () => Promise<void>;
  isLoggingIn: boolean;
  onGuestLogin?: () => Promise<void>;
  isGuestLoggingIn?: boolean;
  gameActive: boolean;
  onRegistered: (name: string, id: string, college: string) => void;
}

export default function MatrixIntroOverlay({ 
  onComplete, 
  user, 
  onLogin, 
  isLoggingIn, 
  onGuestLogin,
  isGuestLoggingIn = false,
  gameActive,
  onRegistered
}: MatrixIntroOverlayProps) {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [millisElapsed, setMillisElapsed] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // Registration Form states
  const [regName, setRegName] = useState<string>(() => {
    return localStorage.getItem("ignitia_reg_name") || "";
  });
  const [regId, setRegId] = useState<string>(() => {
    return localStorage.getItem("ignitia_reg_id") || "";
  });
  const [regCollege, setRegCollege] = useState<string>(() => {
    return localStorage.getItem("ignitia_reg_college") || "";
  });
  const [formError, setFormError] = useState<string>("");

  useEffect(() => {
    if (user && !regName) {
      setRegName(user.displayName || "");
    }
  }, [user]);

  // Audio nodes referenced in refs to cleanly start, modify, and terminate sound loops
  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const tickIntervalRef = useRef<any>(null);
  const synthNodesRef = useRef<any[]>([]);

  // Text contents for the terminal timeline
  const phase1Logs = [
    { time: 200, text: "> Establishing encrypted handshake tunnel... [OK]" },
    { time: 1300, text: "> Setting up server-side cryptographic keys... [OK]" },
    { time: 2500, text: "> Allocating memory for 10 sequential logical blocks... [OK]" }
  ];

  const phase2Text = "Attention all operators. Please clear your terminals and lock your focus to the main screen. The server is officially online. What you are looking at is not a standard quiz. This is a 10-level sequential decryption matrix, separated into two distinct operational phases.";
  const phase3Text = "In Stage 1, you will face the Riddle Vault. Five pure text-based ciphers testing your basic security knowledge. But do not get comfortable. If you survive Stage 1, the system will immediately initiate Stage 2: The Live Activity Matrix.";
  const phase4Text = "You will decrypt analog phone pads. You will scramble against a 25-cell time-attack reflex grid. You will manually manipulate live URL directories and resolve catastrophic timetable clashes before the runtime collapses. You have exactly 5 global hints for the entire system. Use them wisely, or freeze in the data stream. Your time begins... now.";

  // Safe lazy initializer for browser-level Web Audio API
  const getAudioContext = (): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      return ctx;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked in browser.", e);
      return null;
    }
  };

  // Sound generator helpers
  const playClickSound = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(1500, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.start();
      osc.stop(now + 0.045);
    } catch (e) {}
  };

  const startDroneNode = (ctx: AudioContext) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(58, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.5); // smooth room swell
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      
      droneOscRef.current = osc;
      droneGainRef.current = gain;
    } catch (e) {}
  };

  const startClockTicking = (ctx: AudioContext) => {
    if (tickIntervalRef.current) return;
    try {
      tickIntervalRef.current = setInterval(() => {
        if (!ctx || ctx.state === "suspended") return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = "square";
        osc.frequency.setValueAtTime(1000, now);
        
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
        
        osc.start();
        osc.stop(now + 0.025);
      }, 750);
    } catch (e) {}
  };

  const stopClockTicking = () => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
  };

  const playHeavySynthDrop = (ctx: AudioContext) => {
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(110, now);
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(165, now);
      
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 1.2);
      filter.frequency.exponentialRampToValueAtTime(450, now + 3.2);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 2.8);
      
      osc1.start();
      osc2.start();
      
      synthNodesRef.current.push(osc1, osc2, filter, gain);
    } catch (e) {}
  };

  const stopAudioTracksSilently = () => {
    try {
      if (droneOscRef.current) {
        droneOscRef.current.stop();
        droneOscRef.current.disconnect();
      }
    } catch (e) {}
    droneOscRef.current = null;
    droneGainRef.current = null;
    
    stopClockTicking();
    
    synthNodesRef.current.forEach(node => {
      try {
        if ("stop" in node) {
          node.stop();
        }
        node.disconnect();
      } catch (e) {}
    });
    synthNodesRef.current = [];
  };

  // Clock interval for character and phase states
  useEffect(() => {
    if (!isInitialized) return;
    
    const tickMillis = 50;
    const interval = setInterval(() => {
      setMillisElapsed(prev => prev + tickMillis);
    }, tickMillis);
    
    return () => clearInterval(interval);
  }, [isInitialized]);

  // Handle live Web Audio triggers exactly when phases match
  useEffect(() => {
    if (!isInitialized) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // At 0s: start drone
    if (millisElapsed >= 0 && millisElapsed < 100 && !droneOscRef.current) {
      startDroneNode(ctx);
    }
    
    // At 3500ms (Phase 2): start ticking clock
    if (millisElapsed >= 3500 && millisElapsed < 3650 && !tickIntervalRef.current) {
      startClockTicking(ctx);
    }
    
    // At 18000ms (Phase 4): Drop ticking & Play aggressive synth
    if (millisElapsed >= 18000 && millisElapsed < 18150) {
      stopClockTicking();
      playHeavySynthDrop(ctx);
    }
  }, [isInitialized, millisElapsed]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopAudioTracksSilently();
    };
  }, []);

  const handleSubmitRegistration = () => {
    const isUserAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
    if (isUserAdmin) {
      playClickSound();
      setIsInitialized(true);
      return;
    }

    if (!regName.trim()) {
      setFormError("Operator Full Name is required to initialize.");
      return;
    }
    if (!regId.trim()) {
      setFormError("Registration ID / Roll No is required to authenticate.");
      return;
    }
    if (!regCollege.trim()) {
      setFormError("College / Campus Name is required to bind session.");
      return;
    }

    setFormError("");
    localStorage.setItem("ignitia_reg_name", regName.trim());
    localStorage.setItem("ignitia_reg_id", regId.trim());
    localStorage.setItem("ignitia_reg_college", regCollege.trim());

    onRegistered(regName.trim(), regId.trim(), regCollege.trim());

    playClickSound();
    setIsInitialized(true);
  };

  const handleAccessSystemLoop = () => {
    playClickSound();
    setIsFadingOut(true);
    stopAudioTracksSilently();
    
    // Triggers custom start clock hook specified in guidelines
    if (typeof (window as any).startMainGameClock === "function") {
      try {
        (window as any).startMainGameClock();
      } catch (err) {}
    }
    
    localStorage.setItem("ignitia_nexus_intro_completed", "true");
    
    setTimeout(() => {
      onComplete(); // Delete the intro overlay from the DOM
    }, 800);
  };

  // Computes which elements are currently visible depending on millisElapsed
  const visiblePhase1Logs = phase1Logs.filter(log => millisElapsed >= log.time);
  
  const showPhase2Block = millisElapsed >= 3500;
  const p2CharIndex = Math.floor((millisElapsed - 3500) / 25);
  const activeP2Text = phase2Text.substring(0, Math.max(0, p2CharIndex));

  const showPhase3Block = millisElapsed >= 11000;
  const p3CharIndex = Math.floor((millisElapsed - 11000) / 25);
  const activeP3Text = phase3Text.substring(0, Math.max(0, p3CharIndex));

  const showPhase4Block = millisElapsed >= 18000;
  const p4CharIndex = Math.floor((millisElapsed - 18000) / 15);
  const activeP4Text = phase4Text.substring(0, Math.max(0, p4CharIndex));

  const isIntroStoryComplete = millisElapsed >= 23500;

  // Visual outline glow color depending on the phases
  const borderVisualClass = showPhase4Block
    ? "border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
    : showPhase3Block
    ? "border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)]"
    : "border-[#1e293b]/80 shadow-[0_0_30px_rgba(0,0,0,0.5)]";

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;

  return (
    <div
      id="matrix-intro-overlay"
      className={`fixed inset-0 w-screen h-screen bg-[#07080b] z-[9999] flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none font-mono transition-all duration-700 overflow-y-auto ${
        isFadingOut ? "opacity-0 scale-95 blur-md pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Scanline texture CRT overlays */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,6px_100%] pointer-events-none z-50 opacity-40" />

      {/* Top terminal visual diagnostic telemetry bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2 text-xs">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-bold tracking-wider">root@matrix:~#</span>
          <span className="hidden sm:inline text-white/40">// SYSTEM OVERLAY HANDSHAKE</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/30 truncate">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>PORT: 3000 CONSOLE</span>
          <span className="hidden sm:inline">STATE: ACTIVE</span>
        </div>
      </div>

      {/* Central Interactive Console */}
      <div className="flex-grow flex items-center justify-center my-6 md:my-10 px-1">
        {!isInitialized ? (
          // Initial Login / Gateway Verification Setup
          <div className="text-center max-w-md w-full flex flex-col items-center gap-6 bg-slate-950/40 border border-white/5 p-8 rounded-2xl backdrop-blur-md">
            <div className="space-y-3">
              <div className="text-3xl font-black uppercase tracking-widest text-emerald-500 font-mono flex items-center justify-center gap-2">
                <span>IGNITIA_NEXUS</span>
                <span className="w-2.5 h-7 bg-emerald-500 animate-terminal-cursor" />
              </div>
              <p className="text-xs text-white/50 leading-relaxed uppercase py-1">
                Evolvera Club event security platform.<br />
                Authenticating operator credentials before initialization.
              </p>
            </div>

            {!user ? (
              <div className="space-y-4 w-full">
                <p className="text-[10px] font-mono text-cyan-400/90 tracking-wider uppercase bg-cyan-950/20 border border-cyan-500/20 py-2.5 px-4 rounded-lg">
                  STATION IDENTITY SECURITY REQUIRED. PLEASE LOGIN WITH GOOGLE CODES.
                </p>
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={onLogin}
                    disabled={isLoggingIn || isGuestLoggingIn}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 border border-[#1e293b] hover:border-emerald-500 hover:text-emerald-400 font-bold tracking-widest font-mono text-xs text-white rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50 select-none uppercase"
                  >
                    <LogIn className="w-4 h-4 animate-pulse" />
                    <span>{isLoggingIn ? "Authenticating Operator..." : "Authenticate Google ID"}</span>
                  </button>

                  {onGuestLogin && (
                    <button
                      onClick={onGuestLogin}
                      disabled={isLoggingIn || isGuestLoggingIn}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-950 border border-dashed border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 text-[10px] tracking-widest font-mono text-white/50 rounded-xl transition-all cursor-pointer select-none uppercase shadow-md disabled:opacity-50"
                    >
                      <span>{isGuestLoggingIn ? "[ INITIALIZING GUEST KEYPORT... ]" : "[ OR ACCESS STREAM AS GUEST ]"}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-0.5">
                  <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-extrabold flex items-center justify-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Operator Authenticated
                  </p>
                  <p className="text-xs font-bold text-white font-mono">{user.displayName || "Anonymous Operator"}</p>
                  <p className="text-[10px] text-white/40">{user.email}</p>
                </div>

                {isAdmin ? (
                  // Admin bypassing custom inputs
                  <div className="space-y-4">
                    <div className="border border-coral/30 bg-coral/10 p-3 rounded-lg text-coral text-[11px] font-mono uppercase tracking-wide">
                      ⚡ Authorized administrator. System logs unlocked without verification.
                    </div>
                    <button
                      id="initialize-decryption-btn"
                      onClick={handleSubmitRegistration}
                      className="w-full text-xs font-bold font-mono tracking-widest bg-coral/10 border border-coral text-coral hover:bg-coral hover:text-black py-4 px-8 rounded-xl transition-all duration-350 shadow-[0_0_30px_rgba(244,63,94,0.15)] hover:shadow-[0_0_45px_rgba(244,63,94,0.45)] cursor-pointer select-none"
                    >
                      [ INITIALIZE DECRYPTION SYSTEM ]
                    </button>
                  </div>
                ) : (
                  // Regular student operator with full registration forms
                  <div className="space-y-4 text-left font-mono">
                    <div className="bg-slate-950/80 p-4 border border-white/5 rounded-2xl space-y-3">
                      <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest text-center border-b border-white/5 pb-2">
                        COMPETITOR REGISTRATION
                      </p>

                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-white/50 mb-1 font-bold">
                          1. Full Name
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => {
                            setRegName(e.target.value);
                            setFormError("");
                          }}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full bg-slate-900 border border-white/10 hover:border-emerald-500 focus:border-emerald-500 text-xs text-white p-2.5 rounded-xl outline-none transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-white/50 mb-1 font-bold">
                          2. Registration ID / Roll No
                        </label>
                        <input
                          type="text"
                          value={regId}
                          onChange={(e) => {
                            setRegId(e.target.value);
                            setFormError("");
                          }}
                          placeholder="e.g. 2K23/CO/120"
                          className="w-full bg-slate-900 border border-white/10 hover:border-emerald-500 focus:border-emerald-500 text-xs text-white p-2.5 rounded-xl outline-none transition-all font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase tracking-wider text-white/50 mb-1 font-bold">
                          3. College / University
                        </label>
                        <input
                          type="text"
                          value={regCollege}
                          onChange={(e) => {
                            setRegCollege(e.target.value);
                            setFormError("");
                          }}
                          placeholder="e.g. Delhi Technological University"
                          className="w-full bg-slate-900 border border-white/10 hover:border-emerald-500 focus:border-emerald-500 text-xs text-white p-2.5 rounded-xl outline-none transition-all font-mono"
                        />
                      </div>

                      {formError && (
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider text-center pt-1">
                          ⚠ {formError}
                        </p>
                      )}
                    </div>

                    <button
                      id="initialize-decryption-btn"
                      onClick={handleSubmitRegistration}
                      className="w-full text-xs font-bold font-mono tracking-widest bg-emerald-950/40 border border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black py-4 px-8 rounded-xl transition-all duration-350 shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_40px_rgba(16,185,129,0.55)] cursor-pointer select-none uppercase"
                    >
                      [ REGISTER & ACCESS SYSTEM ]
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // Running scripted command matrix sequence
          <div className={`w-full max-w-2xl bg-[#090b11] border rounded-xl p-5 md:p-6 flex flex-col gap-5 relative transition-all duration-500 ${borderVisualClass}`}>
            
            {/* Handshake line debug indicators */}
            <div className="flex items-center justify-between font-mono text-[9px] text-white/30 border-b border-white/5 pb-2">
              <span className="flex items-center gap-1.5">
                <Radio className={`w-3 h-3 ${isIntroStoryComplete ? "text-cyan-400" : "text-emerald-400 animate-pulse"}`} />
                LIVE STREAM TIMELINE: {(millisElapsed / 1000).toFixed(1)}s
              </span>
              <span>BUFFER_READY_100%</span>
            </div>

            {/* Simulated Live Console Log Queue */}
            <div className="font-mono text-xs text-white/80 space-y-4 min-h-[300px] leading-relaxed select-text">
              
              {/* Phase 1 Print Log Outputs */}
              {visiblePhase1Logs.length > 0 && (
                <div className="space-y-1 text-emerald-400/90 font-semibold font-mono text-[11px] select-none">
                  {visiblePhase1Logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span>{log.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Phase 2: Warning Message in Crimson block */}
              {showPhase2Block && (
                <div className="border border-red-500/30 bg-red-950/10 p-3 rounded-lg text-red-200/90 shadow-sm relative overflow-hidden backdrop-blur-xs">
                  <div className="absolute top-1.5 right-2 font-mono text-[8px] text-red-400 font-bold uppercase select-none">
                    CRIMSON_ADVISORY
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-400 mr-1 font-mono uppercase text-[10px] tracking-wide block mb-1">
                        STAGE 1 SECS ACTIVE:
                      </span>
                      <p className="text-[11px] font-mono leading-relaxed">
                        {activeP2Text}
                        {millisElapsed < 11000 && <span className="w-1.5 h-3 bg-red-400 inline-block animate-terminal-cursor ml-0.5" />}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase 3: Stage 2 Threats (Purple) */}
              {showPhase3Block && (
                <div className="border border-purple-500/30 bg-purple-950/10 p-3 rounded-lg text-purple-200/95 shadow-sm relative overflow-hidden backdrop-blur-xs">
                  <div className="absolute top-1.5 right-2 font-mono text-[8px] text-purple-400 font-bold uppercase select-none">
                    THREAT_RADAR
                  </div>
                  <div className="flex items-start gap-2">
                    <Binary className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-400 mr-1 font-mono uppercase text-[10px] tracking-wide block mb-1">
                        STAGE 2 SPECS ACTIVE:
                      </span>
                      <p className="text-[11px] font-mono leading-relaxed">
                        {activeP3Text}
                        {millisElapsed < 18000 && <span className="w-1.5 h-3 bg-purple-400 inline-block animate-terminal-cursor ml-0.5" />}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Phase 4: Peak text in Bright Neon Cyan */}
              {showPhase4Block && (
                <div className="border border-cyan-500/30 bg-cyan-950/10 p-3.5 rounded-lg text-cyan-200 shadow-sm relative overflow-hidden backdrop-blur-xs">
                  <div className="absolute top-1.5 right-2 font-mono text-[8px] text-cyan-400 font-bold uppercase select-none">
                    SYNTH_PEAK_DROP
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} />
                    <div className="w-full">
                      <span className="font-bold text-cyan-400 m-1 font-mono uppercase text-[10px] tracking-wide block mb-1">
                        DECISION_METRICS:
                      </span>
                      <p className="text-[11px] font-mono leading-relaxed tracking-wider font-extrabold text-cyan-200">
                        {activeP4Text}
                        {millisElapsed < 23500 && <span className="w-1.5 h-3 bg-cyan-400 inline-block animate-terminal-cursor ml-0.5" />}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer Control */}
      <div className="border-t border-white/5 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
        <div className="font-mono text-[10px] tracking-wider text-center sm:text-left">
          {isInitialized ? (
            <span className="text-emerald-400/80 animate-pulse font-mono">
              [ SYSTEM STATUS: {isIntroStoryComplete ? "READ_COMPLETE" : "PRINTING_TELEMETRY..."} ]
            </span>
          ) : (
            <span>EVOLVERA DECRYPTION DECK ONLINE v2.0</span>
          )}
        </div>

        <div className="w-full sm:w-auto">
          {isInitialized && (
            <div className="flex justify-center sm:justify-end">
              {isIntroStoryComplete ? (
                isAdmin ? (
                  /* Admin can bypass immediately and start configuring */
                  <button
                    id="access-system-loop-btn"
                    onClick={handleAccessSystemLoop}
                    className="w-full sm:w-auto text-xs font-bold font-mono tracking-widest bg-cyan-950/30 border border-cyan-400 text-cyan-300 py-3 px-6 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_35px_rgba(6,182,212,0.55)] cursor-pointer hover:bg-cyan-400 hover:text-black uppercase animate-pulse select-none text-center"
                  >
                    [ ACCESS SYSTEM: OPEN ADMIN CONSOLE ]
                  </button>
                ) : gameActive ? (
                  /* Normal player unlocked because Admin went live */
                  <button
                    id="access-system-loop-btn"
                    onClick={handleAccessSystemLoop}
                    className="w-full sm:w-auto text-xs font-bold font-mono tracking-widest bg-emerald-950/30 border border-emerald-400 text-emerald-300 py-3 px-6 rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] cursor-pointer hover:bg-emerald-500 hover:text-black uppercase animate-pulse select-none text-center"
                  >
                    [ ENTER MAINFRAME: START DECRYPTION LOOP ]
                  </button>
                ) : (
                  /* Normal player blocked because Admin is offline */
                  <div className="w-full sm:w-auto text-xs font-bold font-mono tracking-widest bg-red-950/40 border border-red-500/40 text-red-400 py-3 px-5 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.15)] uppercase select-none text-center flex items-center justify-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping shrink-0" />
                    <span>SYSTEM LOCKED: AWAITING ADMIN SIGNAL</span>
                  </div>
                )
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
                  <button
                    disabled
                    className="w-full sm:w-auto text-[10px] text-white/30 border border-white/10 px-4 py-2 rounded-lg cursor-not-allowed uppercase text-center font-mono"
                  >
                    Streaming script...
                  </button>
                  <button
                    type="button"
                    onClick={handleAccessSystemLoop}
                    className="w-full sm:w-auto text-[10px] bg-emerald-950/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 text-emerald-400 font-bold px-4 py-2 rounded-lg transition-all cursor-pointer font-mono uppercase text-center shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                  >
                    Skip Cinematic ➔
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}