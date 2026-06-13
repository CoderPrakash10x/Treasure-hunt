import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  HelpCircle, 
  Compass, 
  Fingerprint, 
  Lock, 
  Battery, 
  Wifi, 
  PhoneCall, 
  Target, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  AlertTriangle, 
  Key, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ExternalLink,
  HelpCircle as HintIcon,
  CheckCircle,
  Timer,
  BookOpen,
  Calendar,
  Award,
  Terminal,
  Pause
} from "lucide-react";
import { STAGES_DATA } from "./levelsData";
import PhoneKeypad from "./components/PhoneKeypad";
import ReflexMatrixChallenge from "./components/ReflexMatrixChallenge";
import UrlManipulatorChallenge from "./components/UrlManipulatorChallenge";
import TimetableClashChallenge from "./components/TimetableClashChallenge";
import SecretEscapeChallenge from "./components/SecretEscapeChallenge";
import MatrixIntroOverlay from "./components/MatrixIntroOverlay";
import { db, auth, initAuth, googleSignIn, logout, anonymousSignIn } from "./firebase";
import { doc, onSnapshot, setDoc, collection, query, getDoc } from "firebase/firestore";
import AdminConsole from "./components/AdminConsole";

export default function App() {
  // Game states persisted in localStorage
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(() => {
    const saved = localStorage.getItem("treasure_current_level_idx");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [revealedHints, setRevealedHints] = useState<{ [key: number]: boolean }>(() => {
    const saved = localStorage.getItem("treasure_revealed_hints");
    return saved ? JSON.parse(saved) : {};
  });

  const [hintsRemaining, setHintsRemaining] = useState<number>(() => {
    const saved = localStorage.getItem("treasure_hints_remaining");
    return saved ? parseInt(saved, 10) : 5;
  });

  const [completedLevels, setCompletedLevels] = useState<{ [key: number]: boolean }>(() => {
    const saved = localStorage.getItem("treasure_completed_levels");
    return saved ? JSON.parse(saved) : {};
  });

  const [gameCompleted, setGameCompleted] = useState<boolean>(() => {
    const saved = localStorage.getItem("treasure_game_completed");
    return saved === "true";
  });

  // Local state elements
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "incorrect">("idle");
  const [submittedAnswer, setSubmittedAnswer] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [levelStartTime, setLevelStartTime] = useState<number>(Date.now());
  const [gameStartTime, setGameStartTime] = useState<number>(() => {
    const saved = localStorage.getItem("treasure_game_start_time");
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem("treasure_game_start_time", now.toString());
    return now;
  });

  const [timeTaken, setTimeTaken] = useState<number>(() => {
    const saved = localStorage.getItem("treasure_time_taken");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [adminStartedAt, setAdminStartedAt] = useState<number | null>(null);
  const [hasLoadedDbState, setHasLoadedDbState] = useState<boolean>(false);

  const timeTakenRef = useRef<number>(0);
  useEffect(() => {
    timeTakenRef.current = timeTaken;
  }, [timeTaken]);

  // Intro Startup states
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    const saved = localStorage.getItem("ignitia_nexus_intro_completed");
    return saved !== "true";
  });

  // Authentication & Event management states
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isGuestLoggingIn, setIsGuestLoggingIn] = useState<boolean>(false);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [scoreboard, setScoreboard] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Competitor registration state values
  const [registrantName, setRegistrantName] = useState<string>(() => {
    return localStorage.getItem("ignitia_reg_name") || "";
  });
  const [registrantId, setRegistrantId] = useState<string>(() => {
    return localStorage.getItem("ignitia_reg_id") || "";
  });
  const [registrantCollege, setRegistrantCollege] = useState<string>(() => {
    return localStorage.getItem("ignitia_reg_college") || "";
  });

  const handleRegisteredCustom = (name: string, id: string, college: string) => {
    setRegistrantName(name);
    setRegistrantId(id);
    setRegistrantCollege(college);
  };

  // Monitor Global Game/Event Active Status (re-subscribes safely on auth state transitions)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "gameState", "config"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const active = !!data.gameActive;
        const ended = !!data.gameEnded;

        setGameActive(active);
        setGameEnded(ended);

        if (data.startedAt) {
          setAdminStartedAt(data.startedAt);
        } else {
          setAdminStartedAt(null);
        }

        if (ended && data.finalScoreboard) {
          setScoreboard(data.finalScoreboard);
        } else if (!ended) {
          setScoreboard([]);
        }

        // Under TRUE standby lock (game never started yet), reset any leftover
        // test progress so player starts at Level 1 on "Live" signal.
        // IMPORTANT: do NOT reset on PAUSE — pause also sets gameActive=false
        // but keeps `startedAt` set, so we must check !data.startedAt too.
        if (!active && !ended && !data.startedAt && currentLevelIndex > 0) {
          handleRestartGameLocal();
        }
      }
    }, (err) => {
      console.warn("Retrying database handshake for event status indicators:", err);
    });
    return () => unsub();
  }, [user, showIntro, currentLevelIndex]);

  // Monitor Auth Status on load
  useEffect(() => {
    const unsub = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (err) {
      console.error("Google authentication failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoggingIn(true);
    try {
      const result = await anonymousSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken("");
      }
    } catch (err) {
      console.error("Anonymous/Guest authentication failed:", err);
    } finally {
      setIsGuestLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Save state to Firestore first before clearing local state or logging out
      if (user && user.email !== "icoder.prakash@gmail.com") {
        const pDocRef = doc(db, "participants", user.uid);
        const calculatedScoreTime = Math.max(0, timeTakenRef.current - hintsRemaining * 10);
        const actualClearedLevels = Object.values(completedLevels).filter(Boolean).length;
        await setDoc(pDocRef, {
          userId: user.uid,
          name: registrantName || user.displayName || "Anonymous Operator",
          email: user.email || "",
          registrationId: registrantId || "",
          college: registrantCollege || "",
          clearedLevels: actualClearedLevels,
          currentLevelIndex: currentLevelIndex,
          timeTaken: timeTakenRef.current,
          hintsRemaining: hintsRemaining,
          finalTime: Math.round(calculatedScoreTime),
          gameCompleted: gameCompleted,
          revealedHints: revealedHints,
          completedLevels: completedLevels,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("Logged latest checkpoint to database prior to logout sequence.");
      }

      // 2. Sign out of Firebase auth completely
      await logout();

      // 3. Wipe all local persisted game/session state
      localStorage.clear();

      // 4. Force a full, clean reload of the app so React state, Firestore
      //    subscriptions, and the intro/login overlay all reinitialize fresh.
      //    This avoids stale-state edge cases where the gameplay screen
      //    remains visible after logging out.
      window.location.replace(window.location.origin + window.location.pathname);
    } catch (err) {
      console.error("Logout failed:", err);
      // Even if something failed mid-way, force a reload so the user isn't
      // left stuck on a stale authenticated screen.
      localStorage.clear();
      window.location.replace(window.location.origin + window.location.pathname);
    }
  };

  const handleManualSync = async () => {
    if (!user || user.email === "icoder.prakash@gmail.com") return;
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      const pDocRef = doc(db, "participants", user.uid);
      const calculatedScoreTime = Math.max(0, timeTakenRef.current - hintsRemaining * 10);
      const actualClearedLevels = Object.values(completedLevels).filter(Boolean).length;
      await setDoc(pDocRef, {
        userId: user.uid,
        name: registrantName || user.displayName || "Anonymous Operator",
        email: user.email || "",
        registrationId: registrantId || "",
        college: registrantCollege || "",
        clearedLevels: actualClearedLevels,
        currentLevelIndex: currentLevelIndex,
        timeTaken: timeTakenRef.current,
        hintsRemaining: hintsRemaining,
        finalTime: Math.round(calculatedScoreTime),
        gameCompleted: gameCompleted,
        revealedHints: revealedHints,
        completedLevels: completedLevels,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("Manual sync of player progress succeeded: timeTaken =", timeTakenRef.current);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err) {
      console.error("Manual sync failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Retrieve saved state from Firestore if available
  useEffect(() => {
    if (!user || user.email === "icoder.prakash@gmail.com") {
      setHasLoadedDbState(false);
      return;
    }

    const loadSavedState = async () => {
      try {
        const pDocRef = doc(db, "participants", user.uid);
        const docSnap = await getDoc(pDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Found existing participant DB state, checking merge priority...", data);

          // Track local progress vs Firestore progress
          const localSavedLevelsStr = localStorage.getItem("treasure_completed_levels");
          const localLevelsObj = localSavedLevelsStr ? JSON.parse(localSavedLevelsStr) : {};
          const localClearedCount = Object.values(localLevelsObj).filter(Boolean).length;

          const dbLevelsObj = data.completedLevels || {};
          const dbClearedCount = Object.values(dbLevelsObj).filter(Boolean).length;

          if (localClearedCount > dbClearedCount) {
            console.log(`Local progress (${localClearedCount}) is more advanced than DB progress (${dbClearedCount}). Preserving local storage state.`);
            // Keep local state but sync name, registrar details from DB if exists
            let finalName = data.name || registrantName || user.displayName || "Anonymous Operator";
            let finalRegId = data.registrationId || registrantId || "";
            let finalCollege = data.college || registrantCollege || "";

            if (data.name) {
              setRegistrantName(data.name);
              localStorage.setItem("ignitia_reg_name", data.name);
              finalName = data.name;
            }
            if (data.registrationId) {
              setRegistrantId(data.registrationId);
              localStorage.setItem("ignitia_reg_id", data.registrationId);
              finalRegId = data.registrationId;
            }
            if (data.college) {
              setRegistrantCollege(data.college);
              localStorage.setItem("ignitia_reg_college", data.college);
              finalCollege = data.college;
            }

            try {
              // Retrieve all advanced local storage variables to upload them and bypass rule limitations
              const savedLevelIdxStr = localStorage.getItem("treasure_current_level_idx");
              const resolvedIdx = savedLevelIdxStr ? parseInt(savedLevelIdxStr, 10) : STAGES_DATA.length - 1;

              const savedHintsStr = localStorage.getItem("treasure_hints_remaining");
              const resolvedHintsRem = savedHintsStr ? parseInt(savedHintsStr, 10) : 5;

              const savedRevHintsStr = localStorage.getItem("treasure_revealed_hints");
              const resolvedRevHints = savedRevHintsStr ? JSON.parse(savedRevHintsStr) : {};

              const savedGameCompletedStr = localStorage.getItem("treasure_game_completed");
              const resolvedGameCompleted = savedGameCompletedStr === "true";

              const savedTimeTakenStr = localStorage.getItem("treasure_time_taken");
              const resolvedTimeTaken = savedTimeTakenStr ? parseInt(savedTimeTakenStr, 10) : 0;

              const calculatedScoreTime = Math.max(0, resolvedTimeTaken - resolvedHintsRem * 10);

              // Directly push the high-priority local state to Firestore
              await setDoc(pDocRef, {
                userId: user.uid,
                name: finalName,
                email: user.email || "",
                registrationId: finalRegId,
                college: finalCollege,
                clearedLevels: localClearedCount,
                currentLevelIndex: resolvedIdx,
                timeTaken: resolvedTimeTaken,
                hintsRemaining: resolvedHintsRem,
                finalTime: Math.round(calculatedScoreTime),
                gameCompleted: resolvedGameCompleted,
                revealedHints: resolvedRevHints,
                completedLevels: localLevelsObj,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              console.log("Directly force-synchronized advanced local storage state to Firestore DB.");
            } catch (syncErr) {
              console.error("Direct startup push to Firestore failed:", syncErr);
            }
          } else {
            console.log(`DB progress (${dbClearedCount}) is equal or higher than local progress (${localClearedCount}). Restoring from DB.`);
            if (typeof data.currentLevelIndex === "number") {
              setCurrentLevelIndex(data.currentLevelIndex);
              localStorage.setItem("treasure_current_level_idx", data.currentLevelIndex.toString());
            } else if (typeof data.clearedLevels === "number") {
              const resolvedIdx = data.gameCompleted ? STAGES_DATA.length - 1 : Math.min(data.clearedLevels, STAGES_DATA.length - 1);
              setCurrentLevelIndex(resolvedIdx);
              localStorage.setItem("treasure_current_level_idx", resolvedIdx.toString());
            }
            if (typeof data.hintsRemaining === "number") {
              setHintsRemaining(data.hintsRemaining);
              localStorage.setItem("treasure_hints_remaining", data.hintsRemaining.toString());
            }
            if (data.revealedHints) {
              setRevealedHints(data.revealedHints);
              localStorage.setItem("treasure_revealed_hints", JSON.stringify(data.revealedHints));
            }
            if (data.completedLevels) {
              setCompletedLevels(data.completedLevels);
              localStorage.setItem("treasure_completed_levels", JSON.stringify(data.completedLevels));
            }
            if (typeof data.gameCompleted === "boolean") {
              setGameCompleted(data.gameCompleted);
              localStorage.setItem("treasure_game_completed", data.gameCompleted.toString());
            }
            if (typeof data.timeTaken === "number") {
              setTimeTaken(data.timeTaken);
              localStorage.setItem("treasure_time_taken", data.timeTaken.toString());
            }
            if (data.name) {
              setRegistrantName(data.name);
              localStorage.setItem("ignitia_reg_name", data.name);
            }
            if (data.registrationId) {
              setRegistrantId(data.registrationId);
              localStorage.setItem("ignitia_reg_id", data.registrationId);
            }
            if (data.college) {
              setRegistrantCollege(data.college);
              localStorage.setItem("ignitia_reg_college", data.college);
            }
          }
        } else {
          // No DB state found, meaning they are registering/starting now
          // Initialize timer relative to when the admin started the game
          if (adminStartedAt) {
            const currentOffset = Math.max(0, Math.floor((Date.now() - adminStartedAt) / 1000));
            setTimeTaken(currentOffset);
            localStorage.setItem("treasure_time_taken", currentOffset.toString());
            console.log("No DB state. Initialized player timer to admin start offset:", currentOffset);
          } else {
            setTimeTaken(0);
            localStorage.setItem("treasure_time_taken", "0");
          }
        }
        setHasLoadedDbState(true);
      } catch (err) {
        console.error("Error loading saved state from Firestore:", err);
        // Fallback to local storage if DB fetch fails
        setHasLoadedDbState(true);
      }
    };

    loadSavedState();
  }, [user, adminStartedAt]);

  // Clock ticking interval
  useEffect(() => {
    if (showIntro || !gameActive || gameEnded || gameCompleted || !user || user.email === "icoder.prakash@gmail.com" || !hasLoadedDbState) {
      return;
    }

    const interval = setInterval(() => {
      setTimeTaken((prev) => {
        const next = prev + 1;
        localStorage.setItem("treasure_time_taken", next.toString());
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showIntro, gameActive, gameEnded, gameCompleted, user, hasLoadedDbState]);

  // Heartbeat polling has been disabled to save write operations/block costs.
  // We now utilize a premium interactive Manual Sync Button in the toolbar for on-demand cloud persistence.

  // Register the global window hook as specified in instructions
  useEffect(() => {
    (window as any).startMainGameClock = () => {
      console.log("IGNITIA NEXUS decryptor session officially online.");
      const now = Date.now();
      setGameStartTime(now);
      localStorage.setItem("treasure_game_start_time", now.toString());
      if (adminStartedAt) {
        const offset = Math.max(0, Math.floor((now - adminStartedAt) / 1000));
        setTimeTaken(offset);
        localStorage.setItem("treasure_time_taken", offset.toString());
      } else {
        setTimeTaken(0);
        localStorage.setItem("treasure_time_taken", "0");
      }
    };
    return () => {
      delete (window as any).startMainGameClock;
    };
  }, [adminStartedAt]);

  // Push player database stats inside a background sync hook on key-events!
  useEffect(() => {
    if (!user || user.email === "icoder.prakash@gmail.com") return;

    const syncPlayerStats = async () => {
      try {
        const pDocRef = doc(db, "participants", user.uid);
        const calculatedScoreTime = Math.max(0, timeTakenRef.current - hintsRemaining * 10);
        const actualClearedLevels = Object.values(completedLevels).filter(Boolean).length;

        await setDoc(pDocRef, {
          userId: user.uid,
          name: registrantName || user.displayName || "Anonymous Operator",
          email: user.email || "",
          registrationId: registrantId || "",
          college: registrantCollege || "",
          clearedLevels: actualClearedLevels,
          currentLevelIndex: currentLevelIndex,
          timeTaken: timeTakenRef.current,
          hintsRemaining: hintsRemaining,
          finalTime: Math.round(calculatedScoreTime),
          gameCompleted: gameCompleted,
          revealedHints: revealedHints,
          completedLevels: completedLevels,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("Sync player database stats triggered. saved timeTaken =", timeTakenRef.current);
      } catch (err) {
        console.error("Cloud DB sync failed:", err);
      }
    };

    syncPlayerStats();
  }, [currentLevelIndex, hintsRemaining, gameCompleted, user, registrantName, registrantId, registrantCollege, revealedHints, completedLevels]);

  const currentLevel = STAGES_DATA[currentLevelIndex];

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("treasure_current_level_idx", currentLevelIndex.toString());
    localStorage.setItem("treasure_revealed_hints", JSON.stringify(revealedHints));
    localStorage.setItem("treasure_hints_remaining", hintsRemaining.toString());
    localStorage.setItem("treasure_completed_levels", JSON.stringify(completedLevels));
    localStorage.setItem("treasure_game_completed", gameCompleted.toString());
  }, [currentLevelIndex, revealedHints, hintsRemaining, completedLevels, gameCompleted]);

  // Reset current field answer on level change
  useEffect(() => {
    setUserAnswer("");
    setAnswerState("idle");
    setSubmittedAnswer("");
    setLevelStartTime(Date.now());
  }, [currentLevelIndex]);

  // Sound generator
  const triggerAudioTelemetry = (type: "success" | "error" | "click" | "hint" | "completion" | "boot") => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "click") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "hint") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.4); // C6
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "completion") {
        const now = ctx.currentTime;
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.45); // C6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
        osc.start();
        osc.stop(now + 0.7);
      } else if (type === "boot") {
        const now = ctx.currentTime;
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(784, now + 0.85);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
        osc.start();
        osc.stop(now + 0.85);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(180, now);
        osc2.frequency.exponentialRampToValueAtTime(1174, now + 0.95);
        gain2.gain.setValueAtTime(0.06, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(now + 0.95);
      }
    } catch (e) {
      console.debug("Web audio API telemetry blocked or not yet initialized.");
    }
  };

  // Click handler wrapper
  const handleNavClick = () => {
    triggerAudioTelemetry("click");
  };

  // Verify function for Stage 1 & Level 4 & Level 10
  const handleVerifyAnswer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userAnswer.trim()) return;

    const formattedInput = userAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const acceptedList = currentLevel.acceptedAnswers || [];

    // Check if the formatted input matched
    const matches = acceptedList.some(ans => {
      const formattedAns = ans.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      return formattedInput === formattedAns;
    });

    setSubmittedAnswer(userAnswer);

    if (matches) {
      setAnswerState("correct");
      triggerAudioTelemetry("success");
      
      // Update completed levels
      const nextCompleted = { ...completedLevels, [currentLevelIndex]: true };
      setCompletedLevels(nextCompleted);
    } else {
      setAnswerState("incorrect");
      triggerAudioTelemetry("error");
      
      // Shakes input interface visually
      setTimeout(() => {
        setAnswerState("idle");
      }, 1200);
    }
  };

  // Skip / Auto-trigger completed callback for Secret Escape Challenge
  const handleSecretEscapeSuccess = () => {
    setAnswerState("correct");
    triggerAudioTelemetry("success");
    
    // Save state
    const nextCompleted = { ...completedLevels, [currentLevelIndex]: true };
    setCompletedLevels(nextCompleted);
  };

  // Skip / Auto-trigger completed callback for Reflex Challenge
  const handleMatrixSuccess = () => {
    setAnswerState("correct");
    triggerAudioTelemetry("success");
    
    // Save state
    const nextCompleted = { ...completedLevels, [currentLevelIndex]: true };
    setCompletedLevels(nextCompleted);
  };

  // Skip / Auto-trigger completed callback for URL Challenge
  const handleUrlChallengeSuccess = () => {
    setAnswerState("correct");
    triggerAudioTelemetry("success");
    
    // Save state
    const nextCompleted = { ...completedLevels, [currentLevelIndex]: true };
    setCompletedLevels(nextCompleted);
  };

  // Skip / Auto-trigger completed callback for Timetable Challenge
  const handleTimetableSuccess = () => {
    setAnswerState("correct");
    triggerAudioTelemetry("success");
    
    // Save state
    const nextCompleted = { ...completedLevels, [currentLevelIndex]: true };
    setCompletedLevels(nextCompleted);
  };

  // Advance level helper
  const handleAdvanceLevel = async () => {
    triggerAudioTelemetry("click");
    if (currentLevelIndex < STAGES_DATA.length - 1) {
      setCurrentLevelIndex(prev => prev + 1);
    } else {
      // Game officially completed! Set local state first
      setGameCompleted(true);
      localStorage.setItem("treasure_game_completed", "true");
      triggerAudioTelemetry("completion");

      // Immediately sync final completion state to Firestore directly
      // (cannot rely on useEffect here due to React state batching race condition)
      if (user && user.email !== "icoder.prakash@gmail.com") {
        try {
          const pDocRef = doc(db, "participants", user.uid);
          const finalCompletedLevels = { ...completedLevels, [currentLevelIndex]: true };
          const finalClearedCount = Object.values(finalCompletedLevels).filter(Boolean).length;
          const calculatedScoreTime = Math.max(0, timeTakenRef.current - hintsRemaining * 10);

          await setDoc(pDocRef, {
            userId: user.uid,
            name: registrantName || user.displayName || "Anonymous Operator",
            email: user.email || "",
            registrationId: registrantId || "",
            college: registrantCollege || "",
            clearedLevels: finalClearedCount,
            currentLevelIndex: currentLevelIndex,
            timeTaken: timeTakenRef.current,
            hintsRemaining: hintsRemaining,
            finalTime: Math.round(calculatedScoreTime),
            gameCompleted: true,
            revealedHints: revealedHints,
            completedLevels: finalCompletedLevels,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log("Game completion synced to Firestore. clearedLevels =", finalClearedCount, "gameCompleted = true");
        } catch (err) {
          console.error("Failed to sync game completion to Firestore:", err);
        }
      }
    }
  };

  // Global hint handler
  const handleRevealHint = () => {
    if (hintsRemaining > 0 && !revealedHints[currentLevelIndex]) {
      const confirmReveal = window.confirm(
        "Are you sure you want to use research bandwidth to reveal a hint?\n\nUse your hint carefully, save for stage 2 (tough levels)."
      );
      if (!confirmReveal) return;

      triggerAudioTelemetry("hint");
      setRevealedHints(prev => ({ ...prev, [currentLevelIndex]: true }));
      setHintsRemaining(prev => prev - 1);
    }
  };

  const handleRestartGameLocal = () => {
    setCurrentLevelIndex(0);
    setRevealedHints({});
    setHintsRemaining(5);
    setCompletedLevels({});
    setGameCompleted(false);
    setUserAnswer("");
    setAnswerState("idle");
    setSubmittedAnswer("");
    setTimeTaken(0);
    localStorage.setItem("treasure_time_taken", "0");
    localStorage.clear();
  };

  // Fully restart / wipe database state
  const handleRestartGame = () => {
    if (window.confirm("Are you absolutely sure you want to reset your field logs and restart IGNITIA NEXUS - Treasure Hunt from Level 1?")) {
      triggerAudioTelemetry("click");
      handleRestartGameLocal();
    }
  };

  // Get active visual icon for current level
  const getLevelIcon = (lvlId: number) => {
    switch (lvlId) {
      case 1: return <Compass className="w-5 h-5 text-cyan-400" />;
      case 2: return <Fingerprint className="w-5 h-5 text-purple-400" />;
      case 3: return <Lock className="w-5 h-5 text-indigo-400 animate-pulse" />;
      case 4: return <PhoneCall className="w-5 h-5 text-coral font-bold" />;
      case 5: return <Battery className="w-5 h-5 text-emerald-400" />;
      case 6: return <Terminal className="w-5 h-5 text-pink-400" />;
      case 7: return <Wifi className="w-5 h-5 text-indigo-400" />;
      case 8: return <BookOpen className="w-5 h-5 text-teal-400" />;
      case 9: return <Timer className="w-5 h-5 text-rose-400 animate-pulse" />;
      case 10: return <Calendar className="w-5 h-5 text-emerald-400" />;
      case 11: return <Target className="w-5 h-5 text-amber-500" />;
      case 12: return <Compass className="w-5 h-5 text-coral animate-spin duration-1000" style={{ animationDuration: "10s" }} />;
      default: return <Key className="w-5 h-5 text-gray-400" />;
    }
  };

  // Calculate elapsed time formatted using the dynamic paused/resumed timeTaken tracker
  const getElapsedTimeText = () => {
    const hours = Math.floor(timeTaken / 3600);
    const minutes = Math.floor((timeTaken % 3600) / 60);
    const seconds = timeTaken % 60;

    let displayStr = "";
    if (hours > 0) displayStr += `${hours}h `;
    if (minutes > 0 || hours > 0) displayStr += `${minutes}m `;
    displayStr += `${seconds}s`;
    return displayStr;
  };

  // Check which stage each index belongs to
  const getStageLabel = (index: number) => {
    const lvl = STAGES_DATA[index];
    return lvl.stage === 1 ? "Stage 1: Riddle" : "Stage 2: Ops";
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-[#050b18] text-white flex flex-col justify-between font-sans selection:bg-coral selection:text-slate-950 antialiased relative overflow-hidden">

      {/* Logging Out Overlay - shown while session is being wiped and the app reloads */}
      {isLoggingOut && (
        <div id="logout-overlay" className="fixed inset-0 bg-[#050b18]/98 z-[999999] backdrop-blur-md flex flex-col items-center justify-center font-mono text-center px-4 select-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,6px_100%] pointer-events-none opacity-40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-coral/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative flex flex-col items-center max-w-sm">
            <RefreshCw className="w-10 h-10 text-coral animate-spin mb-4" />
            <div className="text-coral text-sm font-bold uppercase tracking-[0.2em] animate-pulse">
              [ TERMINATING SESSION... ]
            </div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest mt-2 leading-relaxed">
              Wiping local cache and resetting terminal to standby. Redirecting to login...
            </div>
          </div>
        </div>
      )}

      {/* Database State Restoration Loader */}
      {!!user && user.email !== "icoder.prakash@gmail.com" && !hasLoadedDbState && (
        <div id="db-state-restoration-loader" className="fixed inset-0 bg-[#050b18]/97 z-[99999] backdrop-blur-md flex flex-col items-center justify-center font-mono text-center px-4 select-none">
          {/* Scanlines and gradients matching the intro */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,6px_100%] pointer-events-none opacity-40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative flex flex-col items-center max-w-sm">
            <Terminal className="w-10 h-10 text-cyan-400 animate-pulse mb-4" />
            <div className="text-cyan-400 text-sm font-bold uppercase tracking-[0.2em] animate-pulse">
              [ RESTORING FIELD COGNITIVE STATUS... ]
            </div>
            <div className="text-slate-500 text-[10px] uppercase tracking-widest mt-2 leading-relaxed">
              Synchronizing active mission logs, hints list, and decryption session time taken from cloud database core...
            </div>
            <div className="mt-6 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Intro Animation Layer */}
      <AnimatePresence>
        {showIntro && (
          <MatrixIntroOverlay 
            onComplete={() => setShowIntro(false)}
            user={user}
            onLogin={handleGoogleLogin}
            isLoggingIn={isLoggingIn}
            onGuestLogin={handleGuestLogin}
            isGuestLoggingIn={isGuestLoggingIn}
            gameActive={gameActive}
            onRegistered={handleRegisteredCustom}
          />
        )}
      </AnimatePresence>

      {/* Waiting for Admin / Game Concluded Screen Overlay */}
      {!gameActive && user && user.email !== "icoder.prakash@gmail.com" && (
        <div 
          id="waiting-for-admin-overlay" 
          className="fixed inset-0 bg-[#050b18]/97 backdrop-blur-md z-[8000] flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto select-none"
        >
          {/* Scanlines and gradients matching the intro */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,6px_100%] pointer-events-none opacity-40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-coral/5 rounded-full blur-[100px] pointer-events-none" />

          {gameEnded ? (
            <div className="max-w-xl w-full bg-[#0c1425] border border-coral/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_50px_rgba(255,111,97,0.15)] flex flex-col items-center gap-6 my-auto">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-coral via-orange-500 to-coral animate-pulse" />
              
              <div className="flex flex-col items-center text-center gap-2">
                <div className="p-4 bg-slate-950 border border-coral/40 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,111,97,0.2)]">
                  <Award className="w-8 h-8 text-coral animate-bounce" />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight font-mono mt-2">
                  EVENT CONCLUDED
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-sm">
                  The event coordinator has officially concluded the encryption run. Your personal performance logs have been safely registered and frozen.
                </p>
              </div>

              {/* Personal Operator Report Card */}
              <div className="w-full space-y-3">
                <span className="font-mono text-[10px] uppercase text-coral font-bold tracking-widest block text-center">
                  [ INDIVIDUAL MISSION DEBRIEFING ]
                </span>
                
                <div className="bg-slate-950/85 border border-white/5 rounded-2xl p-5 font-mono space-y-4 relative overflow-hidden text-left">
                  {/* Subtle decorative glowing badge */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-coral/5 rounded-full blur-xl pointer-events-none" />

                  {/* Field 1 */}
                  <div className="border-b border-white/5 pb-3">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">OPERATOR CODE NAME</span>
                    <span className="text-sm font-black text-slate-100 uppercase mt-0.5 block">
                      {registrantName || user?.displayName || "Anonymous Operator"}
                    </span>
                  </div>

                  {/* Field 2 */}
                  <div className="border-b border-white/5 pb-3">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">UPLINK REGISTRY ID</span>
                    <span className="text-xs font-black text-cyan-400 mt-0.5 block break-all">
                      {registrantId || "N/A"}
                    </span>
                  </div>

                  {/* Field 3 */}
                  <div className="border-b border-white/5 pb-3">
                    <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">COGNITIVE STATION</span>
                    <span className="text-xs font-semibold text-slate-300 mt-0.5 block capitalize">
                      {registrantCollege || "N/A"}
                    </span>
                  </div>

                  {/* Grid fields */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">STAGES CLEARED</span>
                      <span className="text-base font-black text-purple-400 tracking-tight mt-0.5 block">
                        {Object.values(completedLevels).filter(Boolean).length} <span className="text-slate-600 text-xs font-normal">/ {STAGES_DATA.length}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">ELAPSED TIME</span>
                      <span className="text-base font-black text-slate-200 mt-0.5 block">
                        {Math.round(timeTaken)}s
                      </span>
                    </div>

                    <div className="col-span-2 border-t border-white/5 pt-3" />

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">HINTS COMMITTED</span>
                      <span className="text-xs text-slate-300 font-bold mt-0.5 block">
                        {5 - hintsRemaining} used <span className="text-slate-500 font-normal">({hintsRemaining} unused)</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-coral uppercase block tracking-wider font-bold">FINAL SCORE TIME</span>
                      <span className="text-base font-black text-coral mt-0.5 block">
                        {Math.round(Math.max(0, timeTaken - hintsRemaining * 10))}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 italic max-w-sm text-center leading-relaxed">
                Leaderboards have been securely transmitted to the headquarters core. Other operator channels are classified to maintain secure session standings.
              </p>

              {/* Log Out option */}
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-slate-500 hover:text-coral transition-all font-mono tracking-wider underline cursor-pointer mt-2"
              >
                LOG OUT OF TERMINAL
              </button>
            </div>
          ) : adminStartedAt !== null ? (
            // Paused State Screen Layout
            <div className="max-w-md w-full bg-[#0c1425] border border-amber-500/30 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center gap-6">
              {/* Gold pulsing top indicator bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 animate-pulse" />
              
              {/* Pulse circle for Pause Icon */}
              <div className="relative">
                <div className="p-5 bg-slate-950 border border-amber-500/40 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Pause className="w-10 h-10 text-amber-500 animate-pulse" />
                </div>
                <span className="absolute inset-0 bg-amber-500/10 rounded-full blur-md animate-ping" />
              </div>

              {/* Descriptions of Pause */}
              <div className="space-y-3 font-mono text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-[10px] text-amber-400 font-bold tracking-widest uppercase">
                    MISSION TEMPORARILY PAUSED
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">
                  ACTIVE DECRYPTION ON HOLD
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  The mission coordinator has paused the central clocks. Your current progress (completed stages, used hints, and accumulated time) is safely synchronized on the secure servers. Countdowns are currently on hold.
                </p>
                <div className="p-2.5 px-4 bg-slate-950/80 border border-white/5 rounded-xl text-[11px] text-amber-300 inline-block font-mono">
                  CURRENT LEVEL: <span className="font-bold text-slate-200">Stage {currentLevelIndex + 1}</span> • SAVED TIME: <span className="font-bold text-slate-200">{getElapsedTimeText()}</span>
                </div>
                <p className="text-[10px] text-slate-500 italic font-sans max-w-xs mx-auto">
                  The terminal will automatically unfreeze and resume the decryption count when the coordinator issues the resume play command.
                </p>
              </div>

              {/* Diagnostic data */}
              <div className="w-full bg-slate-950/60 border border-slate-800/50 rounded-xl p-3 text-left font-mono text-[10px] text-slate-500 space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-white/5">
                  <span>STATE SYNC SECURITY:</span>
                  <span className="text-emerald-400 font-bold uppercase">SECURED_&amp;_CHECKPOINTED</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>STATION LOGGED AS:</span>
                  <span className="text-slate-300 font-semibold truncate max-w-[150px]">{user.displayName || "Operator"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>IP/SIGNAL LOCK:</span>
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    STANDBY_PAUSED
                  </span>
                </div>
              </div>

              {/* Log Out option */}
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-slate-500 hover:text-amber-400 transition-all font-mono tracking-wider underline cursor-pointer"
              >
                LOG OUT FROM DECRYPTION LAB
              </button>
            </div>
          ) : (
            // Standby Register waiting state (adminStartedAt is null)
            <div className="max-w-md w-full bg-[#0c1425] border border-rose-500/30 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col items-center gap-6">
              {/* Glow indicator */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 animate-pulse" />
              
              {/* Lock / Waiting Icon Anim */}
              <div className="relative">
                <div className="p-5 bg-slate-950 border border-rose-500/40 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <Lock className="w-10 h-10 text-rose-500 animate-pulse" />
                </div>
                <span className="absolute inset-0 bg-rose-500/10 rounded-full blur-md animate-ping" />
              </div>

              {/* Text descriptions */}
              <div className="space-y-3 font-mono text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-[10px] text-rose-400 font-bold tracking-widest uppercase">
                    REGISTRATION STANDBY
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">
                  WAITING FOR COGNITIVE ENGAGEMENT
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  Your registration status is confirmed! You are sitting comfortably in the decryption terminal lounge. The centralized countdown mission will commence when the coordinator triggers the live initiation wave. 
                </p>
                <div className="py-2 px-3.5 bg-slate-950/80 border border-white/5 rounded-xl text-[11px] text-cyan-400/80 inline-block font-mono animate-pulse">
                  STATUS: <span className="font-bold text-slate-200">LOBBY_READY</span> • GAMEPLAY: <span className="font-bold text-emerald-400">STAGE_1</span>
                </div>
              </div>

              {/* Diagnostic connection / telemetry details */}
              <div className="w-full bg-slate-950/60 border border-slate-800/50 rounded-xl p-3 text-left font-mono text-[10px] text-slate-500 space-y-2">
                <div className="flex justify-between items-center">
                  <span>STATION IDENTITY:</span>
                  <span className="text-slate-300 font-semibold truncate max-w-[150px]">{user.displayName || "Operator"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>REGISTRATION STATUS:</span>
                  <span className="text-emerald-400 font-bold uppercase">{registrantId ? "REGISTERED_ACTIVE" : "SIGN_IN_ONLY"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>CONNECTION GATE:</span>
                  <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    LOBBY_STANDBY_LISTEN
                  </span>
                </div>
              </div>

              {/* Log Out option just in case */}
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-slate-500 hover:text-rose-400 transition-all font-mono tracking-wider underline cursor-pointer"
              >
                LOG OUT OF TERMINAL
              </button>
            </div>
          )}
        </div>
      )}

      {/* High-tech matrix cyber gird background representation */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#0a1220]/60 via-[#050b18] to-[#050b18] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,111,97,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,111,97,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-45 z-0" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-coral/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Primary header elements */}
      <header id="main-cyber-header" className="p-6 bg-[#0a1220] border-b border-coral/20 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & title layout */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0c1425] border border-coral/30 rounded-xl shadow-[0_0_15px_rgba(255,111,97,0.15)] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-coral animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic text-coral">
                IGNITIA NEXUS <span className="text-white opacity-50">v2.0</span>
              </h1>
              <span className="font-mono text-[10px] text-coral tracking-widest opacity-70 uppercase block mt-0.5">
                Evolvera Club • Treasure Hunt
              </span>
            </div>
          </div>

          {/* User & Sound Controllers */}
          <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto justify-end">
            {user && (
              <div className="flex items-center gap-2 bg-slate-950/80 border border-white/5 py-1.5 px-3 rounded-xl font-mono text-xs text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                <span className="truncate max-w-[100px] font-semibold">{user.displayName}</span>
                {user.email === "icoder.prakash@gmail.com" ? (
                  <>
                    <span className="text-[9px] font-black uppercase text-coral bg-coral/10 border border-coral/30 px-1.5 rounded animate-pulse">
                      ADMIN
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-[10px] text-white/45 hover:text-coral hover:underline border-l border-white/10 pl-2 ml-1 cursor-pointer"
                    >
                      LOGOUT
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {user && user.email !== "icoder.prakash@gmail.com" && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                  syncSuccess 
                    ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                    : isSyncing
                    ? "bg-amber-950/30 border-amber-500/30 text-amber-400 cursor-not-allowed"
                    : "bg-[#0c1425] border-coral/30 text-coral hover:border-coral/60 hover:bg-coral/5 shadow-[0_0_10px_rgba(255,111,97,0.1)]"
                }`}
                title="Sync accumulated time and progress to the Cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{syncSuccess ? "SYNCED" : isSyncing ? "SYNCING..." : "SAVE PROGRESS"}</span>
              </button>
            )}
            
            {/* Audio Toggle */}
            <button
              id="audio-toggle-btn"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                triggerAudioTelemetry("click");
              }}
              title={soundEnabled ? "Disable System Sound" : "Enable System Sound"}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                soundEnabled 
                  ? "bg-[#0c1425] border-coral/30 text-coral hover:border-coral/60 shadow-[0_0_10px_rgba(255,111,97,0.1)]" 
                  : "bg-[#050b18] border-slate-800 text-slate-500 hover:border-slate-700"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Global reset button - Only accessible to Admin */}
            {user?.email === "icoder.prakash@gmail.com" && (
              <button
                id="restart-game-btn"
                onClick={handleRestartGame}
                className="px-4 py-2.5 rounded-xl bg-[#0c1425] border border-slate-800 hover:border-coral/35 hover:bg-coral/5 text-slate-300 hover:text-coral text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset State (Admin Only)</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main game center container */}
      <main id="main-content-stage" className="flex-grow max-w-6xl w-full mx-auto px-4 py-4 md:py-6 relative z-10">
        
        {/* Admin operations deck */}
        {user?.email === "icoder.prakash@gmail.com" && (
          <div className="mb-6">
            <AdminConsole accessToken={accessToken || ""} adminEmail={user.email} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!gameCompleted ? (
            <motion.div
              key="gameplay-session"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col lg:flex-row gap-5 items-start w-full"
            >
              
              {/* SIDEBAR PROTOCOL UTILITIES */}
              <div className="w-full lg:w-72 xl:w-80 flex flex-col gap-4 flex-shrink-0">
                
                {/* PROGRESS TRACKING GRID SYSTEM (8 SEGMENTS VISIBLY SEGREGATED) */}
                <div id="progress-bead-timeline-card" className="bg-[#0c1425] border border-coral/20 rounded-2xl p-4 shadow-lg relative overflow-hidden flex-shrink-0">
                  
                  {/* Labels indicating Sections */}
                  <div className="flex items-center justify-between mb-3 border-b border-coral/10 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-3 bg-coral rounded-full shadow-[0_0_6px_#ff6f61]" />
                      <span className="font-mono text-[9px] font-bold text-coral uppercase tracking-wider">Level Timeline Tracker</span>
                    </div>
                  </div>

                  {/* Tracking Beads Timeline Grid - Vertical on desktop/laptop, compact grid on mobile */}
                  <div id="progress-bar-tracking-segments" className="grid grid-cols-4 sm:grid-cols-4 lg:flex lg:flex-col gap-2">
                    {STAGES_DATA.map((lvl, index) => {
                      const isActive = index === currentLevelIndex;
                      const isCompleted = completedLevels[index] || false;
                      const isLocked = index > currentLevelIndex;
                      
                      return (
                        <div
                          key={lvl.id}
                          id={`progress-segment-bead-${lvl.id}`}
                          className={`flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3 rounded-xl border p-2 transition-all text-center lg:text-left relative ${
                            isActive
                              ? "bg-[#0c1425] border-2 border-coral text-white shadow-[0_0_15px_rgba(255,111,97,0.35)]"
                              : isCompleted
                                ? "bg-[#0c1425] border border-coral/40 text-coral shadow-[inset_0_0_10px_rgba(255,111,97,0.15)]"
                                : "bg-[#0c1425]/40 border border-white/5 text-gray-500"
                          }`}
                        >
                          {/* Round numeric badge with state style */}
                          <div className="flex items-center justify-center flex-shrink-0">
                            <div className={`w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center ${
                              isActive
                                ? "bg-coral text-[#050b18] shadow-[0_0_10px_#ff6f61] animate-pulse"
                                : isCompleted
                                  ? "bg-[#0c1425] border border-coral text-coral"
                                  : "bg-slate-900 border border-slate-800 text-slate-400"
                            }`}>
                              {isCompleted ? <Check className="w-3.5 h-3.5" /> : lvl.id}
                            </div>
                          </div>

                          {/* Label name */}
                          <div className="flex-grow min-w-0 text-center lg:text-left">
                            <div className="text-[10px] truncate uppercase font-mono mt-0.5 font-semibold tracking-wide text-slate-300">
                              Level {String(lvl.id).padStart(2, '0')}
                            </div>
                            <div className="hidden lg:block text-[8px] font-mono uppercase tracking-tight text-slate-500">
                              {index < 5 ? "Stage 1 Riddle" : "Stage 2 Operative"}
                            </div>
                          </div>

                          {/* Top/bottom glow lines */}
                          {isActive && (
                            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-coral shadow-[0_0_6px_#ff6f61]" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* COMPACT GLOBAL STATS / HINTS WIDGET - MOVED TO BOTTOM & ULTRA-COMPACT */}
                <div id="stats-hint-panel" className="bg-[#0c1425] border border-pink-500/20 rounded-2xl p-3 shadow-xl flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500/60" />
                  
                  {/* Row 1: Hint count & visual battery power indicator */}
                  <div className="flex items-center justify-between gap-2 pl-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-pink-400 font-bold">
                        ASSIST DECK
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div id="hints-overlay-text" className="font-mono text-[10px] font-bold text-pink-400/90">
                        {hintsRemaining}/5
                      </div>
                      {/* Batteries Slots */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((slot) => {
                          const active = slot <= hintsRemaining;
                          return (
                            <div
                              key={slot}
                              className={`w-2.5 h-1 rounded-sm border-[0.5px] transition-all duration-300 ${
                                active 
                                  ? "bg-pink-500 border-pink-400 shadow-[0_0_4px_rgba(236,72,153,0.5)]" 
                                  : "bg-slate-900 border-slate-800"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Reveal button & advice footer */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      id="reveal-hint-btn"
                      onClick={handleRevealHint}
                      disabled={hintsRemaining <= 0 || revealedHints[currentLevelIndex]}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 justify-center cursor-pointer ${
                        revealedHints[currentLevelIndex]
                          ? "bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 shadow-[inset_0_0_6px_rgba(16,185,129,0.15)]"
                          : hintsRemaining <= 0
                            ? "bg-slate-950/50 border border-slate-900 text-slate-500 cursor-not-allowed"
                            : "bg-pink-500/10 border border-pink-500 hover:bg-pink-500/25 text-pink-400 hover:shadow-[0_0_10px_rgba(236,72,153,0.25)]"
                      }`}
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>
                        {revealedHints[currentLevelIndex] 
                          ? "Hint Unlocked" 
                          : hintsRemaining <= 0 
                            ? "No Hints" 
                            : "Reveal Hint"}
                      </span>
                    </button>

                    <p className="text-[8px] text-amber-300/70 text-center leading-tight font-mono uppercase tracking-wide select-none pointer-events-none">
                      ⚠️ Use carefully, save for stage 2
                    </p>
                  </div>
                </div>

              </div>


              {/* CENTRAL MAIN CONTENT ZONE */}
              <div className="flex-1 w-full flex flex-col gap-4 min-w-0">

                {/* ACTIVE SINGLE CARD FOCUS VIEW (NO SCROLLING MULTI-CARDS) */}
                <div id="active-level-central-card" className="relative group">
                
                {/* Tech background glowing panel backings */}
                <div className={`absolute -inset-0.5 rounded-3xl opacity-30 blur-xl transition-all duration-350 ${
                  currentLevel.stage === 1 
                    ? "bg-coral/25 group-hover:opacity-40" 
                    : "bg-purple-500/25 group-hover:opacity-40"
                }`} />

                {/* Main Card */}
                <div className={`bg-[#0c1425] rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative z-10 overflow-hidden border transition-all duration-300 ${
                  currentLevel.stage === 1 
                    ? "border-coral/30 shadow-[0_0_30px_rgba(255,111,97,0.05)]" 
                    : "border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.05)]"
                }`}>
                  
                  {/* Glossy tech terminal overlays */}
                  <div className={`absolute top-0 right-0 p-3 flex gap-1 font-mono text-[9px] border-l border-b bg-slate-950/40 rounded-bl-xl select-none transition-all ${
                    currentLevel.stage === 1 ? "border-coral/20 text-coral/50" : "border-purple-500/20 text-purple-400/50"
                  }`}>
                    <span>SYS_STAGE: 0{currentLevel.stage}</span>
                    <span className="opacity-30">|</span>
                    <span>LVL_ID: 0{currentLevel.id}</span>
                  </div>

                  {/* Level Heading */}
                  <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 bg-[#050b18] rounded-xl relative border ${
                        currentLevel.stage === 1 ? "border-coral/20" : "border-purple-500/20"
                      }`}>
                        {getLevelIcon(currentLevel.id)}
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping ${
                          currentLevel.stage === 1 ? "bg-coral" : "bg-purple-500"
                        }`} />
                      </div>
                      <div>
                        <span className={`font-mono text-xs uppercase tracking-widest block font-bold ${
                          currentLevel.stage === 1 ? "text-coral" : "text-purple-400"
                        }`}>
                          {currentLevel.stage === 1 ? "🛡️ STAGE 1: Riddle & Text Decryption" : "🔥 STAGE 2: Interactive Operational Protocol"}
                        </span>
                        <h2 id="active-level-title" className="text-2xl font-black mt-1 text-slate-100 flex items-center gap-2">
                          Level {currentLevel.id}
                        </h2>
                      </div>
                    </div>

                    {/* Progress Percent Badge */}
                    <div className={`text-right flex items-center gap-2 font-mono text-xs self-start md:self-auto bg-slate-950/70 px-3 py-1.5 rounded-lg select-none border ${
                      currentLevel.stage === 1 ? "border-coral/20 text-coral" : "border-purple-400/20 text-purple-400"
                    }`}>
                      <span className="opacity-50">INDEX:</span>
                      <span className="font-bold">{currentLevelIndex + 1} of {STAGES_DATA.length}</span>
                    </div>
                  </div>

                  {/* Beautiful Terminal Riddler screen display */}
                  <div className="space-y-6">
                    <div className="relative">
                      <div className={`absolute top-2.5 left-3 font-mono text-[9px] cursor-default select-none pointer-events-none ${
                        currentLevel.stage === 1 ? "text-coral/40" : "text-purple-500/40"
                      }`}>
                        ENCRYPTED_MESSAGE_STREAM
                      </div>
                      
                      <div 
                        id="terminal-riddle-view"
                        className={`bg-[#050b18] p-6 rounded-2xl font-mono text-sm leading-relaxed shadow-inner relative pt-10 min-h-[140px] flex items-center whitespace-pre-line border transition-all ${
                          currentLevel.stage === 1 
                            ? "border-coral/20 text-coral/90 shadow-[inset_0_0_15px_rgba(255,111,97,0.05)]" 
                            : "border-purple-500/20 text-purple-300 shadow-[inset_0_0_15px_rgba(168,85,247,0.05)]"
                        }`}
                      >
                        {/* Micro green dots */}
                        <div className="flex items-center gap-1 cursor-default select-none absolute top-3 right-4">
                          <span className="w-2 h-2 rounded-full bg-red-500/40" />
                          <span className="w-2 h-2 rounded-full bg-yellow-500/40" />
                          <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
                        </div>
                        
                        {/* Riddle Text */}
                        <div className="space-y-2 w-full text-slate-200">
                          {currentLevel.riddle}
                        </div>
                      </div>
                    </div>


                    {/* REVEALED HINT WRAPPER */}
                    {revealedHints[currentLevelIndex] && (
                      <motion.div
                        id="revealed-hint-block"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl text-amber-200 text-xs flex items-start gap-3 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                      >
                        <HintIcon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono uppercase font-bold tracking-wider text-amber-400 block mb-1">Decryption Assistance Hint unlocked:</span>
                          <p>{currentLevel.hint}</p>
                        </div>
                      </motion.div>
                    )}


                    {/* CORE CHALLENGE ACTION STATIONS (STAGES CONTROLS) */}
                    <div id="interactive-challenge-station" className="p-1">
                      
                      {/* STAGE 1 OR STAGE 2 GENERIC RIDDLES */}
                      {currentLevel.id !== 9 && currentLevel.id !== 10 && currentLevel.id !== 11 && currentLevel.id !== 12 ? (
                        <div className="space-y-6">
                           
                           {/* If level 4 is active, render phone keypad accessory if hint revealed */}
                           {currentLevel.id === 4 && (
                            <div className="space-y-4">
                              <p className="font-mono text-xs text-slate-400">
                                Starter string sequence mapping key: <code className="text-coral font-bold bg-[#050b18] px-1.5 py-0.5 rounded border border-coral/20">2=ABC, 3=DEF, 4=GHI, 5=JKL, 6=MNO, 7=PQRS, 8=TUV, 9=WXYZ</code>
                              </p>
                              
                              {revealedHints[currentLevelIndex] && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="py-4"
                                >
                                  <PhoneKeypad />
                                </motion.div>
                              )}
                            </div>
                          )}

                          {/* If level 8 or 12 is active, show the Wikipedia link tool */}
                          {(currentLevel.id === 8) && (
                            <div className="bg-[#050b18] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="text-[10px] font-mono text-coral uppercase tracking-widest">Active Wikipedia Launcher</div>
                                <h4 className="text-sm font-bold text-slate-200">Hyperlink Ladder Mission</h4>
                                <p className="text-xs text-slate-400 max-w-sm">
                                  Use only highlighted hyperlinks within standard articles. Start on the "Coffee" directory, redirect to "Germany".
                                </p>
                              </div>
                              <a
                                id="wikipedia-launcher-link"
                                href={currentLevel.taskUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={handleNavClick}
                                className="px-5 py-3 rounded-xl bg-[#0c1425] border border-coral/35 text-coral hover:text-coral hover:bg-coral/5 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 select-none self-stretch md:self-auto cursor-pointer"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>Access Wikipedia Link</span>
                              </a>
                            </div>
                          )}

                          {/* Default Text Input Submission Interface */}
                          {answerState !== "correct" ? (
                            <form 
                              id="level-answer-form" 
                              onSubmit={handleVerifyAnswer} 
                              className="flex flex-col sm:flex-row gap-3 items-stretch"
                            >
                              <div className="relative flex-grow">
                                <input
                                  id="level-answer-input"
                                  type="text"
                                  autoComplete="off"
                                  spellCheck="false"
                                  value={userAnswer}
                                  onChange={(e) => {
                                    setAnswerState("idle");
                                    setUserAnswer(e.target.value);
                                  }}
                                  placeholder={
                                    currentLevel.id === 8 
                                      ? "Type target country population..." 
                                      : currentLevel.id === 4 
                                        ? "Type decoded word sequence..." 
                                        : "Decode riddle and type key answer..."
                                  }
                                  className={`w-full bg-[#050b18] font-mono text-sm px-5 py-4.5 rounded-2xl border transition-all placeholder:text-slate-600 outline-none focus:placeholder:text-slate-700 capitalize ${
                                    answerState === "incorrect"
                                      ? "border-rose-500/80 ring-2 ring-rose-900/30 text-rose-200 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-shake"
                                      : currentLevel.stage === 1
                                        ? "border-coral/20 focus:border-coral focus:ring-2 focus:ring-coral/30 text-white focus:shadow-[0_0_15px_rgba(255,111,97,0.15)]"
                                        : "border-purple-500/20 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 text-white focus:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                                  }`}
                                />
                                {userAnswer && (
                                  <button
                                    type="button"
                                    onClick={() => setUserAnswer("")}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-350 cursor-pointer font-mono p-1 select-none"
                                  >
                                    C
                                  </button>
                                )}
                              </div>

                              <button
                                type="submit"
                                id="verify-answer-btn"
                                disabled={!userAnswer.trim()}
                                className={`px-6 py-4 rounded-2xl font-bold font-mono text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                  !userAnswer.trim()
                                    ? "bg-slate-900 border border-slate-850 text-slate-600 cursor-not-allowed"
                                    : currentLevel.stage === 1
                                      ? "bg-coral hover:bg-coral/90 text-slate-950 hover:shadow-[0_0_20px_rgba(255,111,97,0.4)]"
                                      : "bg-purple-500 hover:bg-purple-450 text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                }`}
                              >
                                <span>Verify Answer</span>
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </form>
                          ) : null}

                          {/* Access Denied Feedback banner */}
                          {answerState === "incorrect" && (
                            <motion.div
                              id="access-denied-shielder"
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-2xl flex items-center gap-3 text-rose-300"
                            >
                              <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce flex-shrink-0" />
                              <div className="text-xs">
                                <span className="font-mono uppercase font-black block tracking-wider">Access Unrecognized Signature:</span>
                                <span className="font-sans">Submitted key <code className="text-rose-400 font-mono font-bold bg-[#050b18] px-1.5 py-0.5 rounded border border-rose-950">"{submittedAnswer}"</code> is denied. Check clues or request localized hint.</span>
                              </div>
                            </motion.div>
                          )}

                        </div>
                      ) : currentLevel.id === 9 ? (
                        
                        /* --- STAGE 2 - Level 9: Reflex Matrix Challenge --- */
                        <div>
                          {answerState !== "correct" ? (
                            <ReflexMatrixChallenge onSuccess={handleMatrixSuccess} />
                          ) : null}
                        </div>

                      ) : currentLevel.id === 10 ? (
                        
                        /* --- STAGE 2 - Level 10: Timetable Clash Challenge --- */
                        <div>
                          {answerState !== "correct" ? (
                            <TimetableClashChallenge onSuccess={handleTimetableSuccess} />
                          ) : null}
                        </div>

                      ) : currentLevel.id === 11 ? (
                        
                        /* --- STAGE 2 - Level 11: URL Manipulator Challenge --- */
                        <div>
                          {answerState !== "correct" ? (
                            <UrlManipulatorChallenge onSuccess={handleUrlChallengeSuccess} />
                          ) : null}
                        </div>

                      ) : (
                        
                        /* --- STAGE 2 - Level 12: Secret Escape Challenge --- */
                        <div>
                          {answerState !== "correct" ? (
                            <SecretEscapeChallenge onSuccess={handleSecretEscapeSuccess} />
                          ) : null}
                        </div>

                      )}


                      {/* CORRECT STAGE ACCESS GRANTED PANEL (TIP REVEAL) */}
                      {answerState === "correct" && (
                        <motion.div
                          id="access-granted-panel"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-6 space-y-5"
                        >
                          <div className="flex items-center gap-3 text-emerald-400">
                            <div className="p-2 bg-emerald-950/60 border border-emerald-800 rounded-lg">
                              <CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 font-bold block">Status Checklist Passed</span>
                              <h4 className="text-lg font-bold">Access Granted: Cryptographic Hash Verified</h4>
                            </div>
                          </div>

                          {currentLevel.tip && (
                            <div className="p-4 bg-emerald-950/15 border border-emerald-900/35 rounded-xl font-mono text-xs leading-relaxed text-emerald-300">
                              <span className="text-[10px] uppercase tracking-wider text-emerald-500 block mb-1 font-bold">Scientific Telemetry Insight:</span>
                              <p>{currentLevel.tip}</p>
                            </div>
                          )}

                          {/* Navigation button to go to next Level */}
                          <div className="pt-2 flex justify-end">
                            <button
                              id="advance-level-btn"
                              onClick={handleAdvanceLevel}
                              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold font-mono text-sm rounded-xl hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                            >
                              <span>
                                {currentLevelIndex < STAGES_DATA.length - 1 
                                  ? "Initialize Next Encryption Loop" 
                                  : "Submit Cryptographic Key Logs"}
                              </span>
                              <ArrowRight className="w-4 h-4 text-slate-950" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                    </div>

                  </div>

                </div>
              </div>


              {/* HIGH LEVEL GAME STATS PANEL */}
              <div id="gameplay-timer-log-card" className="bg-[#0c1425]/40 border border-white/5 text-slate-500 p-4.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 select-none">
                <span className="font-mono text-[10px] uppercase tracking-widest">
                  Active Mission Session: <b className="text-slate-300">Level {currentLevel.id}</b>
                </span>
                
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>SYSTEM_TIMER: <b className="text-slate-300">{getElapsedTimeText()}</b></span>
                  <span className="text-slate-800">|</span>
                  <span>IP_PING: <b className="text-slate-350">12ms</b></span>
                </div>
              </div>

            </div>

            </motion.div>
          ) : (
            
            /* --- CONGRATULATORY VICTORY SCREEN --- */
            <motion.div
              key="gameplay-victory"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl mx-auto py-10"
            >
              <div id="victory-card-panel" className="bg-[#0c1425] border border-coral/30 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_50px_rgba(255,111,97,0.15)] flex flex-col items-center gap-6 my-auto">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-coral via-orange-500 to-coral animate-pulse" />
                
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-4 bg-slate-950 border border-coral/40 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,111,97,0.2)]">
                    <Award className="w-8 h-8 text-coral animate-bounce" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight font-mono mt-2">
                    🎉 ALL LEVELS DECRYPTED!
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-sm">
                    Outstanding! You have successfully cracked all 12 encryption levels of IGNITIA NEXUS. Your final score has been transmitted to the operations headquarters.
                  </p>
                </div>

                {/* Personal Operator Report Card */}
                <div className="w-full space-y-3">
                  <span className="font-mono text-[10px] uppercase text-coral font-bold tracking-widest block text-center">
                    [ INDIVIDUAL MISSION DEBRIEFING ]
                  </span>
                  
                  <div className="bg-slate-950/85 border border-white/5 rounded-2xl p-5 font-mono space-y-4 relative overflow-hidden text-left">
                    {/* Subtle decorative glowing badge */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-coral/5 rounded-full blur-xl pointer-events-none" />

                    {/* Field 1 */}
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">OPERATOR CODE NAME</span>
                      <span className="text-sm font-black text-slate-100 uppercase mt-0.5 block">
                        {registrantName || user?.displayName || "Anonymous Operator"}
                      </span>
                    </div>

                    {/* Field 2 */}
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">UPLINK REGISTRY ID</span>
                      <span className="text-xs font-black text-cyan-400 mt-0.5 block break-all">
                        {registrantId || "N/A"}
                      </span>
                    </div>

                    {/* Field 3 */}
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">COGNITIVE STATION</span>
                      <span className="text-xs font-semibold text-slate-300 mt-0.5 block capitalize">
                        {registrantCollege || "N/A"}
                      </span>
                    </div>

                    {/* Grid fields */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">STAGES CLEARED</span>
                        <span className="text-base font-black text-emerald-400 tracking-tight mt-0.5 block">
                          {STAGES_DATA.length} <span className="text-slate-600 text-xs font-normal">/ {STAGES_DATA.length} ✓</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">ELAPSED TIME</span>
                        <span className="text-base font-black text-slate-200 mt-0.5 block">
                          {Math.round(timeTaken)}s
                        </span>
                      </div>

                      <div className="col-span-2 border-t border-white/5 pt-3" />

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block tracking-wider font-bold">HINTS COMMITTED</span>
                        <span className="text-xs text-slate-300 font-bold mt-0.5 block">
                          {5 - hintsRemaining} used <span className="text-slate-500 font-normal">({hintsRemaining} unused)</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-coral uppercase block tracking-wider font-bold">FINAL SCORE TIME</span>
                        <span className="text-base font-black text-coral mt-0.5 block">
                          {Math.round(Math.max(0, timeTaken - hintsRemaining * 10))}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic max-w-sm text-center leading-relaxed">
                  Leaderboards have been securely transmitted to the headquarters core. Other operator channels are classified to maintain secure session standings.
                </p>

                {/* Log Out option */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-slate-500 hover:text-coral transition-all font-mono tracking-wider underline cursor-pointer mt-2"
                >
                  LOG OUT OF TERMINAL
                </button>
              </div>
            </motion.div>

          )}
        </AnimatePresence>

      </main>

      {/* Aesthetic humbler footer of game */}
      <footer id="main-cyber-footer" className="p-4 bg-black border-t border-white/10 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>SYSTEM_STATUS:</span>
            <span className="text-coral flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-coral shadow-[0_0_5px_#ff6f61] animate-pulse" />
              UPLINK SECURE
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest text-center sm:text-left">
            Tech Hunt Sandbox • React 19 • Tailwind v4
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>LATENCY:</span>
            <span className="text-coral flex items-center gap-1.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
              12MS
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}