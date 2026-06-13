import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { Shield, Play, Pause, FileSpreadsheet, Users, Layers, Award, Trash2, Download, CheckCircle2, RotateCcw } from "lucide-react";
import { STAGES_DATA } from "../levelsData";

interface ParticipantData {
  id: string;
  userId: string;
  name: string;
  email: string;
  registrationId?: string;
  college?: string;
  clearedLevels: number;
  timeTaken: number;
  hintsRemaining: number;
  finalTime: number;
  gameCompleted: boolean;
  updatedAt?: string;
}

interface AdminConsoleProps {
  accessToken: string;
  adminEmail: string;
}

export default function AdminConsole({ accessToken, adminEmail }: AdminConsoleProps) {
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [liveSync, setLiveSync] = useState<boolean>(true);
  const [gameState, setGameState] = useState<{ gameActive: boolean; startedAt: number | null; gameEnded: boolean }>({
    gameActive: false,
    startedAt: null,
    gameEnded: false
  });
  
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [exportResult, setExportResult] = useState<{ count: number } | null>(null);
  const [errorText, setErrorText] = useState<string>("");

  const fetchParticipantsOnDemand = async () => {
    try {
      const q = query(collection(db, "participants"));
      const snapshot = await getDocs(q);
      const items: ParticipantData[] = [];
      snapshot.forEach((pDoc) => {
        items.push({ id: pDoc.id, ...pDoc.data() } as ParticipantData);
      });
      setParticipants(items);
    } catch (err: any) {
      console.error("Manual fetch of scoreboard failed:", err);
      setErrorText("On-demand scoreboard fetch failed: " + err.message);
    }
  };

  const [sessionTime, setSessionTime] = useState<number>(0);

  // Ticking session clock for admin telemetry
  useEffect(() => {
    if (!gameState.gameActive || !gameState.startedAt) {
      if (!gameState.startedAt) {
        setSessionTime(0);
      }
      return;
    }

    const updateTime = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - gameState.startedAt!) / 1000));
      setSessionTime(elapsed);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [gameState.gameActive, gameState.startedAt]);

  const triggerCSVDownload = (dataList: ParticipantData[]) => {
    // Sort participants by clearedLevels desc, then finalTime asc
    const sorted = [...dataList].sort((a, b) => {
      if (b.clearedLevels !== a.clearedLevels) {
        return b.clearedLevels - a.clearedLevels;
      }
      return a.finalTime - b.finalTime;
    });

    const headers = [
      "Rank", 
      "Player ID", 
      "Operator Code Name", 
      "Player Email", 
      "Registration ID",
      "College / University",
      "Cleared Levels", 
      "Duration Taken (Seconds)", 
      "Remaining Hints", 
      "Calculated Final Score (Seconds)", 
      "Completed All Levels?"
    ];

    const rows = sorted.map((p, idx) => [
      idx + 1,
      `"${(p.userId || "").replace(/"/g, '""')}"`,
      `"${(p.name || "Anonymous").replace(/"/g, '""')}"`,
      `"${(p.email || "").replace(/"/g, '""')}"`,
      `"${(p.registrationId || "N/A").replace(/"/g, '""')}"`,
      `"${(p.college || "N/A").replace(/"/g, '""')}"`,
      p.clearedLevels,
      Math.round(p.timeTaken),
      p.hintsRemaining,
      Math.round(p.finalTime),
      p.gameCompleted ? "YES" : "NO"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ignitia_Nexus_Scoreboard_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToCSV = () => {
    if (participants.length === 0) {
      setErrorText("No participant session rows are present to write.");
      return;
    }
    
    setErrorText("");
    setExportLoading(true);
    setExportResult(null);

    try {
      triggerCSVDownload(participants);
      setExportResult({
        count: participants.length
      });
    } catch (err: any) {
      console.error(err);
      setErrorText("CSV export error: " + (err.message || err));
    } finally {
      setExportLoading(false);
    }
  };

  // 1. Subscribe to Live Participants score directory (Conditional on liveSync)
  useEffect(() => {
    if (!liveSync) return;
    const q = query(collection(db, "participants"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ParticipantData[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ParticipantData);
      });
      setParticipants(items);
    }, (err) => {
      console.error("Subscription to scoreboard failed:", err);
    });
    return () => unsubscribe();
  }, [liveSync]);

  // 2. Subscribe to Global Event Status
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "gameState", "config"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setGameState({
          gameActive: !!data.gameActive,
          startedAt: data.startedAt || null,
          gameEnded: !!data.gameEnded
        });
      }
    }, (err) => {
      console.error("Subscription to game state failed:", err);
    });
    return () => unsub();
  }, []);

  // Change Event trigger status
  const handleToggleGameState = async (active: boolean) => {
    setErrorText("");
    try {
      await setDoc(doc(db, "gameState", "config"), {
        gameActive: active,
        gameEnded: false,
        finalScoreboard: [],
        startedAt: active ? (gameState.startedAt || Date.now()) : gameState.startedAt,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      setErrorText("Failed to sync event activation coordinates to database: " + err.message);
    }
  };

  // Explicitly Conclude Game / End Event (And Auto-Download Final CSV Result)
  const handleEndGame = async () => {
    const confirmed = window.confirm(
      "CONFIRMATION REQUIRED: Are you sure you want to end this game event? All active player screen sessions will freeze in 'Concluded' and the final official results will automatically download as a CSV file."
    );
    if (!confirmed) return;

    setErrorText("");
    try {
      // Map participants to lightweight scoreboard entries to keep document size ultra-low and safe
      const mappedScoreboard = participants
        .map(p => ({
          userId: p.userId || p.id || "",
          name: p.name || "Anonymous",
          college: p.college || "",
          clearedLevels: p.clearedLevels || 0,
          finalTime: p.finalTime || 0,
          updatedAt: p.updatedAt || ""
        }))
        .sort((a, b) => {
          if (b.clearedLevels !== a.clearedLevels) return b.clearedLevels - a.clearedLevels;
          return a.finalTime - b.finalTime;
        });

      await setDoc(doc(db, "gameState", "config"), {
        gameActive: false,
        gameEnded: true,
        finalScoreboard: mappedScoreboard,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Automatically trigger CSV download upon concluding game!
      if (participants.length > 0) {
        triggerCSVDownload(participants);
        setExportResult({ count: participants.length });
        alert("The game has ended. The official scoreboard CSV sheet was downloaded automatically!");
      } else {
        alert("Event ended successfully. (No participants registered to download.)");
      }
    } catch (err: any) {
      setErrorText("Failed to end the game event: " + err.message);
    }
  };

  // Completely wipe participant rows (Admin Reset)
  const handleClearScoreboard = async () => {
    const confirmed = window.confirm(
      "CRITICAL: Are you sure you want to securely purge all participant logs and scores? This cannot be undone."
    );
    if (!confirmed) return;

    setErrorText("");
    try {
      // Loop and delete
      for (const p of participants) {
        await deleteDoc(doc(db, "participants", p.id));
      }
      
      // Also clear finalScoreboard from gameState config and reset game states
      await setDoc(doc(db, "gameState", "config"), {
        finalScoreboard: [],
        gameActive: false,
        gameEnded: false,
        startedAt: null,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert("Purged scoreboard databases successfully.");
    } catch (err: any) {
      setErrorText("Scoreboard purge error: " + err.message);
    }
  };

  // Set Game State back to locked / waiting standby mode
  const handleResetToStandby = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to restore the game to standby state? This clears the ENDED screen screen overlays on competitor terminals, restoring registration/standby screens so they can log in for subsequent campaigns."
    );
    if (!confirmed) return;

    setErrorText("");
    try {
      await setDoc(doc(db, "gameState", "config"), {
        gameActive: false,
        gameEnded: false,
        startedAt: null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      setErrorText("Failed to restore game to standby state: " + err.message);
    }
  };

  // Sort real-time display list for visual leaderboard
  const scoreboardSorted = [...participants].sort((a,b) => {
    if (b.clearedLevels !== a.clearedLevels) {
      return b.clearedLevels - a.clearedLevels;
    }
    return a.finalTime - b.finalTime;
  });

  return (
    <div className="bg-[#0b1324] border border-coral/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-coral/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header telemetry and title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4.5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-coral/10 border border-coral/40 rounded-xl">
            <Shield className="w-5 h-5 text-coral" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono uppercase tracking-widest text-coral">
              OPERATIONS DECK [ADMIN]
            </h3>
            <span className="text-[10px] text-white/50 font-mono">
              AUTHORIZED CONSOLE FOR: {adminEmail}
            </span>
          </div>
        </div>

        {/* Global state activation controllers */}
        <div className="flex items-center gap-2 font-mono">
          {gameState.gameActive ? (
            <>
              <button
                type="button"
                onClick={() => handleToggleGameState(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/30 hover:bg-amber-500 hover:text-black border border-amber-500/50 rounded-lg text-xs font-bold text-amber-400 transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE GAME TIMER</span>
              </button>
              <button
                type="button"
                onClick={handleEndGame}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-600 hover:text-white border border-red-500/50 rounded-lg text-xs font-bold text-red-100 transition-all cursor-pointer"
                title="End game and download results CSV spreadsheet automatically"
              >
                <span>END GAME &amp; DOWNLOAD CSV</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleToggleGameState(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/30 hover:bg-emerald-500 hover:text-black border border-emerald-500/50 rounded-lg text-xs font-bold text-emerald-400 transition-all cursor-pointer animate-pulse"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{gameState.startedAt ? "RESUME GAME" : "START GAME (GO LIVE)"}</span>
              </button>
              {!gameState.gameEnded ? (
                <button
                  type="button"
                  onClick={handleEndGame}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-600 hover:text-white border border-red-500/50 rounded-lg text-xs font-bold text-red-100 transition-all cursor-pointer"
                  title="Conclude game and download results CSV spreadsheet automatically"
                >
                  <span>END GAME &amp; DOWNLOAD CSV</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetToStandby}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/30 hover:bg-cyan-500 hover:text-black border border-cyan-500/50 rounded-lg text-xs font-bold text-cyan-400 transition-all cursor-pointer animate-pulse"
                  title="Unlock mainframe back to registration waiting/standby mode"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET TO STANDBY</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleClearScoreboard}
            title="Purge participant database logs"
            className="p-1.5 bg-red-950/30 hover:bg-red-500 hover:text-white border border-red-500/40 text-red-400 rounded-lg text-xs cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {errorText && (
        <div className="bg-red-950/10 border border-red-500/30 text-red-200 p-3 rounded-xl text-xs font-mono mb-5">
          {errorText}
        </div>
      )}

      {/* Analytics Overview Panels */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 font-mono">
          <div className="flex items-center justify-between text-white/40 mb-1">
            <span className="text-[9px] uppercase tracking-wider">Online Players</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-bold text-cyan-400">{participants.length}</p>
        </div>

        <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 font-mono">
          <div className="flex items-center justify-between text-white/40 mb-1">
            <span className="text-[9px] uppercase tracking-wider">EVENT STATUS</span>
            <span className={`h-1.5 w-1.5 rounded-full ${gameState.gameActive ? "bg-emerald-500" : gameState.gameEnded ? "bg-red-500" : gameState.startedAt ? "bg-amber-500" : "bg-cyan-400"}`} />
          </div>
          <p className={`text-xl font-bold uppercase ${gameState.gameActive ? "text-emerald-400" : gameState.gameEnded ? "text-red-400" : gameState.startedAt ? "text-amber-400" : "text-cyan-400"}`}>
            {gameState.gameActive ? "LIVE" : gameState.gameEnded ? "ENDED" : gameState.startedAt ? "PAUSED" : "STANDBY"}
          </p>
        </div>

        <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 font-mono">
          <div className="flex items-center justify-between text-white/40 mb-1">
            <span className="text-[9px] uppercase tracking-wider">SESSION RUNTIME</span>
            <span className={`h-2 w-2 rounded-full ${gameState.gameActive ? "bg-amber-500 animate-pulse animate-ping" : "bg-slate-700"}`} />
          </div>
          <p className="text-xl font-bold text-amber-400 font-mono">
            {sessionTime}s
          </p>
        </div>

        <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 font-mono">
          <div className="flex items-center justify-between text-white/40 mb-1">
            <span className="text-[9px] uppercase tracking-wider">Average Clear</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-purple-400">
            {participants.length 
              ? (participants.reduce((sum, p) => sum + p.clearedLevels, 0) / participants.length).toFixed(1)
              : "0.0"} / {STAGES_DATA.length}
          </p>
        </div>

        <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3 font-mono">
          <div className="flex items-center justify-between text-white/40 mb-1">
            <span className="text-[9px] uppercase tracking-wider">CSV Scoreboard Export</span>
            <Download className="w-3.5 h-3.5 text-coral" />
          </div>
          <button
            type="button"
            onClick={handleExportToCSV}
            disabled={exportLoading || participants.length === 0}
            className="text-[10px] uppercase font-bold text-coral flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left font-mono mt-1"
          >
            {exportLoading ? "[ EXPORTING... ]" : "[ 💾 DOWNLOAD CSV ]"}
          </button>
        </div>
      </div>

      {/* Manual Guideline explaining Pauses, Standby, Ending and CSV download flow */}
      <div className="bg-slate-950/45 border border-white/5 rounded-2xl p-4.5 mb-6 font-sans text-xs text-slate-400 space-y-2.5 leading-relaxed">
        <h5 className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
          [ MISSION OPERATIONS HANDBOOK ]
        </h5>
        <ul className="list-disc pl-4 space-y-1.5">
          <li>
            <strong className="text-emerald-400 font-mono">START GAME / RESUME GAME:</strong> Synchronously launches or resumes active countdowns for players. This activates Level 1 controls.
          </li>
          <li>
            <strong className="text-amber-400 font-mono">PAUSE GAME TIMER:</strong> Pauses the event clock. Player terminals show an informative <strong className="text-amber-300">"TEMPORARILY PAUSED"</strong> visor on hold. This halts ticking. All current solved states, solved riddle levels, and logged time remain completely preserved in the cloud.
          </li>
          <li>
            <strong className="text-red-400 font-mono">END GAME &amp; CSV AUTO-DOWNLOAD:</strong> Finalizes gameplay. Terminals are frozen onto the leaderboards, and the <strong>official standings are automatically generated and downloaded as a clean CSV spreadsheet</strong> on your browser in one click.
          </li>
          <li>
            <strong className="text-cyan-400 font-mono">RESET TO STANDBY:</strong> Returns the game from ENDED/CONCLUDED status back to the registration lobby screen. It preserves competitor accounts but removes blockades so players can view introductory blocks or log in for subsequential runs.
          </li>
          <li>
            <strong className="text-red-500 font-mono">PURGE (TRASH CAN):</strong> Completely deletes every participant score and account. Use this to clean the blackboard for a brand new event.
          </li>
        </ul>
      </div>

      {/* Export successful notification callback */}
      {exportResult && (
        <div className="bg-emerald-950/20 border border-emerald-500/40 p-4.5 rounded-2xl mb-6 font-mono flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-emerald-300">
                SCOREBOARD DOWNLOADED SUCCESSFULLY:
              </p>
              <p className="text-[10px] text-white/60">
                Saved Ignitia Nexus scoreboard file locally with {exportResult.count} competitor records.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live competitors table & controllers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-white/5 pb-3">
        <h4 className="text-xs uppercase font-mono tracking-wider font-extrabold text-white/80 shrink-0">
          PARTICIPANTS LEADERBOARD (DYNAMIC SCORE)
        </h4>
        
        <div className="flex items-center gap-2">
          {/* Live subscription status pill and trigger toggle */}
          <button
            type="button"
            onClick={() => {
              const newSync = !liveSync;
              setLiveSync(newSync);
              if (!newSync) {
                // If turning off, make sure we have current snapshot loaded
                fetchParticipantsOnDemand();
              }
            }}
            className={`px-2 px-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${
              liveSync 
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30" 
                : "bg-slate-900/60 border-slate-700/50 text-slate-400 hover:bg-slate-900"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${liveSync ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
            <span>{liveSync ? "Live Auto-Sync On" : "Auto-Sync Off"}</span>
          </button>

          {/* Manual Refresh Trigger Button */}
          <button
            type="button"
            onClick={fetchParticipantsOnDemand}
            disabled={liveSync}
            className={`px-2 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer border ${
              liveSync
                ? "opacity-30 cursor-not-allowed bg-slate-900/20 border-slate-800 text-slate-500"
                : "bg-cyan-950/40 border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/80"
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Refresh Table</span>
          </button>
        </div>
      </div>
      <div className="bg-slate-950/80 border border-white/5 rounded-2xl overflow-hidden font-mono max-h-[300px] overflow-y-auto">
        {scoreboardSorted.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/30 italic">
            Waiting for operators to register...
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/2 text-white/40 uppercase text-[9px] tracking-wider select-none">
                <th className="p-3">Rank</th>
                <th className="p-3">Code Name</th>
                <th className="p-3 select-all">Email</th>
                <th className="p-3 text-center">Cleared</th>
                <th className="p-3 text-right">Elapsed</th>
                <th className="p-3 text-center">Hints Lft</th>
                <th className="p-3 text-right text-coral font-bold">Final Time Score</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {scoreboardSorted.map((p, idx) => (
                <tr key={p.id} className="hover:bg-white/1 text-white/80 transition-all text-[11px]">
                  <td className="p-3 font-bold text-white/40">#{idx + 1}</td>
                  <td className="p-3 font-semibold text-white truncate max-w-[160px]" title={p.name}>
                    <div>{p.name || "Anonymous"}</div>
                    {(p.registrationId || p.college) && (
                      <div className="text-[9px] text-white/50 font-normal mt-0.5 truncate max-w-[150px]">
                        {p.registrationId || "N/A"} • {p.college || "N/A"}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-white/50 text-[10px] break-all">{p.email}</td>
                  <td className="p-3 font-bold text-center text-purple-400">{p.clearedLevels} / {STAGES_DATA.length}</td>
                  <td className="p-3 text-right text-white/60">{Math.round(p.timeTaken)}s</td>
                  <td className="p-3 text-center text-cyan-400">{p.hintsRemaining}</td>
                  <td className="p-3 text-right text-coral font-black">{Math.round(p.finalTime)}s</td>
                  <td className="p-3 text-center">
                    {p.gameCompleted ? (
                      <span className="px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[9px] rounded-md font-bold uppercase">
                        COMPLETED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-cyan-950/45 border border-cyan-500/30 text-cyan-400 text-[9px] rounded-md uppercase">
                        DECRYPTING
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
