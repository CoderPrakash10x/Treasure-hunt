import React, { useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Globe, ArrowRight, RotateCw, ShieldAlert, Monitor, CheckCircle, ShieldCheck } from "lucide-react";

interface UrlManipulatorChallengeProps {
  onSuccess: () => void;
}

export default function UrlManipulatorChallenge({ onSuccess }: UrlManipulatorChallengeProps) {
  const targetUrl = "www.campusfest.com/student/year3/scores/admin_view.html";
  const [url, setUrl] = useState("www.campusfest.com/student/year1/scores/guest_view.html");
  const [hasCompleted, setHasCompleted] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const handleNavigate = () => {
    const sanitizedInput = url.trim().toLowerCase();
    const sanitizedTarget = targetUrl.toLowerCase();

    if (sanitizedInput === sanitizedTarget) {
      setHasCompleted(true);
      setErrorFeedback(null);
      // Wait slightly for a beautiful transition, then call onSuccess
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      // Dynamic tips based on what's wrong with their input URL
      if (!sanitizedInput.includes("year3")) {
        setErrorFeedback("[ACCESS VIOLATION: Access block on student directory year sequence. Try targeting the specific folder for 'Year 3Fest Archives'.]");
      } else if (!sanitizedInput.includes("admin_view")) {
        setErrorFeedback("[AUTHENTICATION FAILURE: Directory authenticated, but 'guest_view' is flagged is restricted. Escalate credentials to 'admin_view' to display scores.]");
      } else {
        setErrorFeedback(`[CONNECTION ERROR: Server host could not resolve path sequence "${url}". Make sure the domain, nesting structure, and filename match the database standard exactly.]`);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNavigate();
    }
  };

  return (
    <div id="url-manipulator-station" className="w-full space-y-4">
      {/* Mock Desktop Web Browser Wrapper */}
      <div 
        id="mock-browser-window" 
        className={`bg-[#050b18] border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          hasCompleted 
            ? "border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]" 
            : errorFeedback 
              ? "border-rose-500/40 shadow-[0_0_25px_rgba(239,68,68,0.1)]" 
              : "border-coral/20 shadow-[0_0_20px_rgba(255,111,97,0.05)]"
        }`}
      >
        {/* Browser Top Title Bar with red, yellow, green window control dots */}
        <div className="bg-[#0c1425] border-b border-white/5 py-3 px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <div id="browser-tab-title" className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 bg-[#050b18] px-3 py-1 rounded-md border border-white/5">
            <Monitor className="w-3 h-3 text-coral/70" />
            <span>Secure Directory Viewer v4.0.9</span>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>

        {/* Browser Controls & Editable Address Bar Row */}
        <div id="browser-control-strip" className="bg-[#090f1e] p-2.5 sm:p-3 border-b border-white/5 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
          <div className="flex items-center justify-between md:justify-start gap-1.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-[#050b18] hover:bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 cursor-not-allowed text-xs">
                <span>←</span>
              </div>
              <div className="w-6 h-6 rounded-md bg-[#050b18] hover:bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 cursor-not-allowed text-xs">
                <span>→</span>
              </div>
              <button 
                onClick={() => {
                  setErrorFeedback(null);
                  setUrl("www.campusfest.com/student/year1/scores/guest_view.html");
                }}
                title="Reset URL path to default" 
                className="w-6 h-6 rounded-md bg-[#050b18] hover:bg-coral/10 hover:text-coral border border-white/5 flex items-center justify-center text-slate-400 cursor-pointer transition-colors"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>
            {/* On mobile, we put the Navigate button on the top sub-row next to controls to save valuable display height */}
            <button
              id="browser-navigate-btn-mobile"
              onClick={handleNavigate}
              disabled={hasCompleted}
              className={`md:hidden px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer flex-shrink-0 ${
                hasCompleted
                  ? "bg-emerald-950/40 border border-emerald-800 text-emerald-400 cursor-not-allowed"
                  : "bg-coral/10 hover:bg-coral/20 text-coral border border-coral/30 hover:shadow-[0_0_10px_rgba(255,111,97,0.2)]"
              }`}
            >
              <span>Navigate</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
 
          {/* Editable Mock Address Bar Input (Fills full width on mobile) */}
          <div className="flex-grow w-full flex items-center bg-[#050b18] border border-white/10 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-mono text-slate-200 transition-all focus-within:border-coral/50 focus-within:shadow-[0_0_10px_rgba(255,111,97,0.1)]">
            <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mr-1.5 sm:mr-2" />
            <input
              id="browser-address-input"
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={url}
              onChange={(e) => {
                setErrorFeedback(null);
                setUrl(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={hasCompleted}
              className="w-full bg-transparent outline-none text-slate-200 placeholder-slate-700 select-all"
              placeholder="Enter secured server routing URL..."
            />
          </div>
 
          {/* Navigate Trigger Button (Desktop Layout) */}
          <button
            id="browser-navigate-btn"
            onClick={handleNavigate}
            disabled={hasCompleted}
            className={`hidden md:flex px-3 py-2 rounded-lg font-mono text-xs font-bold transition-all items-center gap-1.5 cursor-pointer flex-shrink-0 ${
              hasCompleted
                ? "bg-emerald-950/40 border border-emerald-800 text-emerald-400 cursor-not-allowed"
                : "bg-coral/10 hover:bg-coral/20 text-coral border border-coral/30 hover:shadow-[0_0_10px_rgba(255,111,97,0.2)]"
            }`}
          >
            <span>Navigate</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Live Rendering Display Window Content viewport */}
        <div id="browser-viewport-display" className="p-8 min-h-[160px] bg-[#030712] flex flex-col items-center justify-center select-none relative">
          
          <AnimatePresence mode="wait">
            {!hasCompleted ? (
              <motion.div
                key="forbidden-frame"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md text-center space-y-4"
              >
                {/* Red warning header logo */}
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-500 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <ShieldAlert className="w-6 h-6 animate-pulse" />
                  </div>
                </div>

                {/* Main 403 Forbidden Blinking Crimson warning box */}
                <div id="viewport-warning-message" className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-400 font-mono text-xs leading-relaxed space-y-2">
                  <span className="text-rose-500 font-extrabold uppercase animate-pulse block tracking-wider">
                    [ERROR 403: ACCESS DENIED]
                  </span>
                  <p className="text-slate-300 font-sans">
                    Guests are not allowed to view Year 3 Fest Archives. Admin permission parameters and precise year-group nesting routing expected.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="granted-frame"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md text-center space-y-3"
              >
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-950/50 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 font-mono text-xs leading-relaxed space-y-1">
                  <span className="text-emerald-400 font-extrabold uppercase tracking-widest block">
                    [GATEWAY ACCESSED: REDIRECTING]
                  </span>
                  <p className="text-slate-300 font-sans">
                    Year 3 score archive and admin dashboard unlocked. Gateway handshake approved.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Absolute Background Scanline details */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(244,63,94,0.01)_50%)] bg-[length:100%_4px] pointer-events-none" />
        </div>
      </div>

      {/* Interactive Helper Realtime Warning Hints under input */}
      <AnimatePresence>
        {errorFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-rose-300 font-mono text-[11px] leading-relaxed flex items-start gap-2.5 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="uppercase font-bold tracking-wider text-rose-400 block">Console Error feedback:</span>
              <p className="text-slate-300 font-sans">{errorFeedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
