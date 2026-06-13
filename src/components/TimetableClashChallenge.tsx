import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, CheckCircle2, AlertCircle, RefreshCw, GripVertical, Check, ArrowRight } from "lucide-react";

interface TimetableClashProps {
  onSuccess: () => void;
}

type Subject = "Maths" | "Physics" | "Workshop";
type Day = "Monday" | "Tuesday" | "Wednesday";

export default function TimetableClashChallenge({ onSuccess }: TimetableClashProps) {
  // Store where each subject is. Null means it's in the selection pool
  const [assignments, setAssignments] = useState<Record<Day, Subject | null>>({
    Monday: null,
    Tuesday: null,
    Wednesday: null,
  });

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  // Calculate which subjects are still unassigned (in the pool)
  const assignedSubjects = Object.values(assignments).filter(Boolean) as Subject[];
  const unassignedSubjects: Subject[] = (["Maths", "Physics", "Workshop"] as Subject[]).filter(
    (sub) => !assignedSubjects.includes(sub)
  );

  // Drag and Drop State and Handlers
  const handleDragStart = (e: React.DragEvent, subject: Subject) => {
    e.dataTransfer.setData("text/plain", subject);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDay: Day) => {
    e.preventDefault();
    const subject = e.dataTransfer.getData("text/plain") as Subject;
    if (!subject) return;
    assignSubjectToDay(subject, targetDay);
  };

  // Helper logic to assign/reassign subject safely without duplicates
  const assignSubjectToDay = (subject: Subject, targetDay: Day) => {
    setFeedback({ type: null, message: "" });
    setAssignments((prev) => {
      const next = { ...prev };
      
      // Find where it was previously assigned and free that day
      (Object.keys(next) as Day[]).forEach((day) => {
        if (next[day] === subject) {
          next[day] = null;
        }
      });

      // Update target day
      next[targetDay] = subject;
      return next;
    });
    setSelectedSubject(null);
  };

  const handlePoolClick = (subject: Subject) => {
    setFeedback({ type: null, message: "" });
    if (selectedSubject === subject) {
      setSelectedSubject(null);
    } else {
      setSelectedSubject(subject);
    }
  };

  const handleDaySlotClick = (day: Day) => {
    setFeedback({ type: null, message: "" });
    if (selectedSubject) {
      assignSubjectToDay(selectedSubject, day);
    } else {
      // If clicked and has a subject assigned, remove it (send back to pool)
      const currentAssigned = assignments[day];
      if (currentAssigned) {
        setAssignments((prev) => ({
          ...prev,
          [day]: null,
        }));
      }
    }
  };

  const handleReset = () => {
    setAssignments({
      Monday: null,
      Tuesday: null,
      Wednesday: null,
    });
    setSelectedSubject(null);
    setFeedback({ type: null, message: "" });
  };

  const handleSubmit = () => {
    // Audit constraints
    const isAllPlaced = assignments.Monday && assignments.Tuesday && assignments.Wednesday;
    if (!isAllPlaced) {
      setFeedback({
        type: "error",
        message: "STATION WARNING: You must assign all three exam subjects into the calendar days before submitting.",
      });
      return;
    }

    // Checking Monday = Maths, Tuesday = Workshop, Wednesday = Physics
    const isMondayCorrect = assignments.Monday === "Maths";
    const isTuesdayCorrect = assignments.Tuesday === "Workshop";
    const isWednesdayCorrect = assignments.Wednesday === "Physics";

    if (isMondayCorrect && isTuesdayCorrect && isWednesdayCorrect) {
      setFeedback({
        type: "success",
        message: "⚡ SUCCESS: TIMETABLE RESOLVED! Scheduling handshake established. Moving forward...",
      });
      
      // Deliberate small timeout to let completion animation flash
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      // Dynamic hint on what failed
      let reason = "The current sequence causes a structural conflict. Try re-reading the logic variables panel!";
      if (assignments.Monday === "Physics") {
        reason = "CLASH: Physics is scheduled on Monday, which directly violates Condition 1.";
      } else if (
        (assignments.Monday === "Workshop" && assignments.Tuesday !== "Maths") ||
        (assignments.Tuesday === "Workshop" && assignments.Monday !== "Maths") ||
        (assignments.Wednesday === "Workshop" && assignments.Tuesday !== "Maths")
      ) {
        reason = "CLASH: Workshop is not scheduled on the immediate day after the Maths exam (Condition 2).";
      }
      
      setFeedback({
        type: "error",
        message: `CONFLICT DETECTED: ${reason}`,
      });
    }
  };

  const getSubjectColor = (subject: Subject) => {
    switch (subject) {
      case "Maths":
        return "from-coral/10 to-coral/20 border-coral/30 text-coral";
      case "Physics":
        return "from-pink-500/10 to-pink-500/20 border-pink-500/30 text-pink-400";
      case "Workshop":
        return "from-purple-500/10 to-purple-500/20 border-purple-500/30 text-purple-400";
    }
  };

  const getSubjectShadowDef = (subject: Subject) => {
    switch (subject) {
      case "Maths":
        return "shadow-[0_0_12px_rgba(255,111,97,0.2)]";
      case "Physics":
        return "shadow-[0_0_12px_rgba(236,72,153,0.2)]";
      case "Workshop":
        return "shadow-[0_0_12px_rgba(168,85,247,0.2)]";
    }
  };

  return (
    <div id="timetable-clash-station" className="w-full space-y-5">
      {/* Constraints logic card and schedule grid divided */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Left Hand: Logic constraints side panel */}
        <div className="bg-[#0c1425] border border-coral/20 p-4 rounded-2xl space-y-4 md:col-span-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-coral" />
              <span className="font-mono text-xs font-bold text-coral uppercase tracking-wider">
                Constraint Log
              </span>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Verify your subject slots against physical resource mappings:
            </p>

            <div className="space-y-2 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-pink-400 font-bold uppercase">
                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-full" />
                  Condition 1
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  The <b className="text-pink-400">Physics</b> exam cannot be on Monday.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-400 font-bold uppercase">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  Condition 2
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  The <b className="text-purple-400">Workshop</b> exam must happen exactly the day after the <b className="text-coral text-shadow">Maths</b> exam.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
            <div className="text-[10px] font-mono text-slate-400 leading-normal">
              💡 <span className="font-semibold text-coral">Tip:</span> Click a card to select it, then click a day to place it, or drag them directly.
            </div>
            <button
              onClick={handleReset}
              className="py-2 px-3 border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-[#0c1425] text-slate-400 hover:text-slate-200 rounded-xl text-xs font-mono transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Layout</span>
            </button>
          </div>
        </div>

        {/* Right Hand: Interactive Placement Grid Columns */}
        <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="grid grid-cols-3 gap-3">
            {(["Monday", "Tuesday", "Wednesday"] as Day[]).map((day) => {
              const assigned = assignments[day];
              return (
                <div
                  key={day}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                  onClick={() => handleDaySlotClick(day)}
                  id={`slot-${day.toLowerCase()}`}
                  className={`min-h-[140px] rounded-2xl border transition-all duration-200 flex flex-col justify-between p-3 cursor-pointer relative select-none group ${
                    assigned
                      ? "bg-slate-950/90 border-coral/35 shadow-[0_0_15px_rgba(255,111,97,0.05)]"
                      : "bg-[#0c1425]/50 hover:bg-[#0c1425]/80 border-slate-850 hover:border-coral/20 border-dashed"
                  }`}
                >
                  {/* Grid Column Header */}
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                      {day}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500">
                      EXAM_ZONE_0{day === "Monday" ? "1" : day === "Tuesday" ? "02" : "03"}
                    </span>
                  </div>

                  {/* Drop zone inside visualization */}
                  <div className="flex-1 flex items-center justify-center py-2">
                    <AnimatePresence mode="wait">
                      {assigned ? (
                        <motion.div
                          key={assigned}
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.85, opacity: 0 }}
                          className={`w-full p-2.5 rounded-xl border bg-gradient-to-br ${getSubjectColor(
                            assigned
                          )} ${getSubjectShadowDef(assigned)} text-center flex flex-col items-center justify-center relative`}
                        >
                          <GripVertical className="absolute right-1.5 top-1.5 w-3 h-3 opacity-30 group-hover:opacity-60 transition-opacity" />
                          <span className="text-xs font-mono font-bold tracking-wider uppercase block">
                            {assigned}
                          </span>
                          <span className="text-[8px] opacity-60 font-mono mt-0.5">
                            Exam Standardized
                          </span>
                        </motion.div>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-600 group-hover:text-slate-400 transition-colors">
                          Empty Slot
                        </span>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Absolute visual highlight outline */}
                  {selectedSubject && !assigned && (
                    <div className="absolute inset-0 border-2 border-coral/40 rounded-2xl animate-pulse pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Subjects selection pool */}
          <div className="bg-[#0c1425] border border-white/5 p-4 rounded-2xl">
            <div className="text-xs font-mono text-slate-400 mb-3 tracking-widest uppercase">
              Available Subject Blocks:
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["Maths", "Physics", "Workshop"] as Subject[]).map((sub) => {
                const isAssigned = assignedSubjects.includes(sub);
                 const isSelected = selectedSubject === sub;

                return (
                  <button
                    key={sub}
                    disabled={isAssigned && feedback.type === "success"}
                    draggable={!isAssigned}
                    onDragStart={(e) => handleDragStart(e, sub)}
                    onClick={() => !isAssigned && handlePoolClick(sub)}
                    className={`p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${
                      isAssigned
                        ? "bg-slate-900 border-white/5 text-slate-600 opacity-30 cursor-not-allowed"
                        : isSelected
                          ? "bg-coral/10 border-coral text-coral ring-2 ring-coral/305"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-[#0c1425]/60"
                    }`}
                  >
                    <div className="absolute left-1.5 top-1.5 flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    </div>
                    <span className="font-mono text-xs font-extrabold uppercase tracking-widest block">
                      {sub}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 block mt-0.5">
                      {isAssigned ? "Placed" : "Draft token"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Validation Prompt Output & Action Trigger Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-white/5">
        <div className="flex-grow w-full max-w-lg min-h-[36px]">
          <AnimatePresence mode="wait">
            {feedback.message ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`p-2 px-3 rounded-xl font-mono text-[11px] leading-relaxed flex items-start gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-950/30 border border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/30 border border-rose-500/30 text-rose-300"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="uppercase font-bold tracking-wider block">
                    {feedback.type === "success" ? "Security Core Accepted" : "Warning alert"}
                  </span>
                  <p className="font-sans text-xs">{feedback.message}</p>
                </div>
              </motion.div>
            ) : (
              <p className="text-xs text-slate-500 font-mono italic flex items-center h-full">
                * All subjects must be slotted chronologically to avoid colliding with college resource bounds.
              </p>
            )}
          </AnimatePresence>
        </div>

        <button
          id="submit-schedule-btn"
          onClick={handleSubmit}
          disabled={feedback.type === "success"}
          className={`px-5 py-3 rounded-xl font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer transition-all self-stretch sm:self-auto ${
            feedback.type === "success"
              ? "bg-emerald-950/50 border border-emerald-800 text-emerald-400 cursor-not-allowed"
              : "bg-coral text-slate-950 hover:bg-coral/90 hover:shadow-[0_0_15px_rgba(255,111,97,0.4)]"
          }`}
        >
          <span>Submit Schedule</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
