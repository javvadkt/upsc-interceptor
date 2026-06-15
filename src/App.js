import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize Supabase Connection
const SUPABASE_URL = "[https://zivoqvmjjguvtgvrdorx.supabase.co](https://zivoqvmjjguvtgvrdorx.supabase.co)";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppdm9xdm1qamd1dnRndnJkb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ0MDQ5NCwiZXhwIjoyMDk3MDE2NDk0fQ.wfl_fJD5QCVdJxgz6DVC5gdG_KLKaldtg_uKW6OSZ70";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  // Database & Mode State
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false); 
  const [savedLogs, setSavedLogs] = useState([]); 

  // App Interaction States
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [trapData, setTrapData] = useState(null);
  const [justification, setJustification] = useState("");
  
  // Interactive UI Toggles
  const [activeBlueprintTab, setActiveBlueprintTab] = useState(null);
  const [showHint, setShowHint] = useState(false); // NEW: Controls key hint visibility

  // Score Tracking
  const [score, setScore] = useState(0);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  // 2. Fetch the Questions on Load
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const { data, error } = await supabase
          .from("prelims_pyqs")
          .select("*")
          .order("id", { ascending: true });

        if (error) throw error;
        if (data) setQuestions(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  // 3. Fetch your Survival Guide (Error Logs)
  const fetchErrorLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("user_error_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setSavedLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  // Toggle Review Mode
  const toggleReviewMode = () => {
    if (!isReviewMode) {
      fetchErrorLogs(); 
    }
    setIsReviewMode(!isReviewMode);
  };

  // 4. Logic to handle option clicks
  const handleOptionClick = (key) => {
    if (isLocked || isAnswered) return;
    setSelectedOption(key);

    if (key !== questions[currentIdx].correct_answer) {
      setTrapData({ reason: questions[currentIdx].trap_explanation });
      setIsLocked(true);
      setNegativeMarks((prev) => prev + 0.66);
    } else {
      setIsAnswered(true);
      setScore((prev) => prev + 2.0);
    }
  };

  // 5. Logic to release the lockdown & SAVE TO DATABASE
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (justification.trim().length < 10) {
      alert("Your justification is too short. Reflect deeply on the structural trap to unlock.");
      return;
    }

    try {
      await supabase.from("user_error_logs").insert([
        {
          question_id: questions[currentIdx].id,
          micro_topic_id: questions[currentIdx].micro_topic_id,
          original_trap: questions[currentIdx].trap_explanation,
          user_rule: justification,
        },
      ]);
    } catch (err) {
      console.error("Network error while saving:", err);
    }

    setIsLocked(false);
    setIsAnswered(true);
    setTrapData(null);
    setJustification("");
    setActiveBlueprintTab(null); 
    setShowHint(false);
  };

  const handleNext = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIdx((prev) => prev + 1);
    setActiveBlueprintTab(null); 
    setShowHint(false); // Reset hint state for the next item
  };

  // UI: Loading Screen
  if (isLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
        <h2>Connecting to Neural Engine...</h2>
        <p>Loading Predictive Dataset...</p>
      </div>
    );
  }

  // UI: End of Test Screen
  if (questions.length === 0 || currentIdx >= questions.length) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
        <h2>Session Complete!</h2>
        <p>Total Score: <strong>{(score - negativeMarks).toFixed(2)}</strong></p>
        <button onClick={toggleReviewMode} style={{ marginTop: '20px', padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isReviewMode ? "Close Survival Guide" : "📖 Open Full Survival Guide"}
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  // ==========================================
  // UI RENDER: REVIEW MODE (THE SURVIVAL GUIDE)
  // ==========================================
  if (isReviewMode) {
    return (
      <div style={{ fontFamily: "sans-serif", maxWidth: "700px", margin: "40px auto", padding: "20px" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🧠 My Survival Guide</h2>
          <button onClick={toggleReviewMode} style={{ padding: '8px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Back to Test
          </button>
        </div>

        {savedLogs.length === 0 ? (
          <p>No errors logged yet. Go take a test and make some mistakes!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {savedLogs.map((log) => (
              <div key={log.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
                <span style={{ fontSize: '11px', background: '#eee', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>{log.micro_topic_id}</span>
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#555' }}>
                  <strong>The Trap Encountered:</strong> {log.original_trap}
                </div>
                <div style={{ marginTop: '10px', fontSize: '15px', color: '#b71c1c', background: '#ffebee', padding: '10px', borderLeft: '3px solid #f44336', borderRadius: '4px' }}>
                  <strong>My Protective Strategic Rule:</strong> "{log.user_rule}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // UI RENDER: TEST MODE (THE INTERCEPTOR)
  // ==========================================
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "650px", margin: "40px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px", position: "relative" }}>
      
      {/* Top Review Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
         <button onClick={toggleReviewMode} style={{ padding: '6px 12px', background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            📖 Open Survival Guide
         </button>
      </div>

      {/* Dashboard Stats Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", paddingBottom: "10px", borderBottom: "2px solid #eee", fontSize: "14px" }}>
        <div><strong>Score:</strong> <span style={{ color: "green" }}>+{score.toFixed(2)}</span></div>
        <div><strong>Status:</strong> {isLocked ? <span style={{ color: "red", fontWeight: "bold" }}>LOCKED</span> : <span style={{ color: "green" }}>ACTIVE</span>}</div>
        <div><strong>Negative:</strong> <span style={{ color: "red" }}>-{negativeMarks.toFixed(2)}</span></div>
      </div>

      {/* Predictive Metadata Display */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", fontSize: "11px", textTransform: "uppercase", flexWrap: "wrap" }}>
        <span style={{ background: "#eee", padding: "4px 8px", borderRadius: "4px" }}>{currentQuestion.micro_topic_id}</span>
        <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "4px 8px", borderRadius: "4px" }}>{currentQuestion.primary_theme}</span>
        <span style={{ background: currentQuestion.difficulty_tier === 3 ? "#ffebee" : "#fff3e0", color: currentQuestion.difficulty_tier === 3 ? "#c62828" : "#e65100", padding: "4px 8px", borderRadius: "4px" }}>
          Tier {currentQuestion.difficulty_tier} Trap
        </span>
      </div>

      {/* Main Question Block */}
      <div>
        <p style={{ fontSize: "16px", lineHeight: "1.6", whiteSpace: "pre-wrap", marginTop: "10px", marginBottom: "15px" }}>{currentQuestion.question_text}</p>
      </div>

      {/* INTERACTIVE HINT CORE COMPONENT */}
      {currentQuestion.key_hint && !isAnswered && !isLocked && (
        <div style={{ marginBottom: "20px" }}>
          <button 
            onClick={() => setShowHint(!showHint)}
            style={{ background: "none", border: "none", color: "#0288d1", cursor: "pointer", fontSize: "13px", fontWeight: "bold", padding: 0, display: "flex", alignItems: "center", gap: "4px" }}
          >
            {showHint ? "🙈 Hide Key Hint" : "💡 Reveal Key Hint"}
          </button>
          {showHint && (
            <div style={{ marginTop: "8px", padding: "12px", background: "#e1f5fe", borderLeft: "4px solid #0288d1", borderRadius: "4px", fontSize: "14px", color: "#01579b", lineHeight: "1.4" }}>
              <strong>Hint Strategy:</strong> {currentQuestion.key_hint}
            </div>
          )}
        </div>
      )}

      {/* Multiple Choice Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
        {currentQuestion.options && Object.entries(currentQuestion.options).map(([key, value]) => {
          let buttonStyle = { padding: "12px", textAlign: "left", background: "#fff", border: "1px solid #ccc", borderRadius: "6px", cursor: isLocked || isAnswered ? "not-allowed" : "pointer", fontSize: "15px", width: "100%" };
          if (selectedOption === key) { buttonStyle.border = "2px solid #000"; buttonStyle.background = "#f0f0f0"; }
          if (isAnswered && !isLocked && key === currentQuestion.correct_answer) { buttonStyle.border = "2px solid green"; buttonStyle.background = "#e8f5e9"; }

          return (
            <button key={key} disabled={isLocked || isAnswered} onClick={() => handleOptionClick(key)} style={buttonStyle}>
              <strong>{key}.</strong> {value}
            </button>
          );
        })}
      </div>

      {/* CORE SCHOLASTIC EXPLANATION VIEWPORT */}
      {isAnswered && !isLocked && currentQuestion.explanation && (
        <div style={{ marginTop: "25px", padding: "18px", background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: "6px", borderLeft: "4px solid #4caf50" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#2e7d32", display: "flex", alignItems: "center", gap: "6px" }}>
            📖 Comprehensive Academic Explanation
          </h4>
          <p style={{ fontSize: "14.5px", color: "#333", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" }}>
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Bottom Navigation Panel */}
      {isAnswered && !isLocked && (
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <button onClick={handleNext} style={{ padding: "10px 20px", background: "#000", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
            Next Question
          </button>
        </div>
      )}

      {/* THE 4-STEP INLINE LOCKDOWN INTERCEPTOR */}
      {isLocked && trapData && (
        <div style={{ marginTop: '30px', padding: '25px', borderRadius: '8px', border: '3px solid red', background: '#fff', boxShadow: '0 4px 12px rgba(255,0,0,0.15)' }}>
          <h2 style={{ color: 'red', marginTop: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            ⚠️ CRITICAL LOGIC ERROR DETECTED
          </h2>
          
          {/* ANALYSIS 1: THE TRIGGERED TRAP (MICRO VIEW) */}
          <div style={{ background: '#fff5f5', padding: '15px', borderRadius: '6px', borderLeft: '4px solid red', marginBottom: '15px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#c62828', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>🚨 Your Triggered Trap</span>
            <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.5', margin: 0 }}>
              {currentQuestion.option_traps && currentQuestion.option_traps[selectedOption] 
                ? currentQuestion.option_traps[selectedOption]
                : currentQuestion.trap_explanation}
            </p>
          </div>

          {/* ANALYSIS 2: THE OVERARCHING DESIGN (MACRO VIEW) */}
          <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #1976d2', marginBottom: '15px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1565c0', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>📐 Question Design Blueprint</span>
            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.5', margin: 0 }}>
              {currentQuestion.trap_explanation}
            </p>
          </div>

          {/* ANALYSIS 3: THE EXAMINER'S BLUEPRINT WITH PROGRESSIVE DISCLOSURE */}
          <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #455a64', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#455a64', display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>
              🔍 Explore Alternative Distractor Traps
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQuestion.options && Object.entries(currentQuestion.options).map(([key, value]) => {
                if (key === currentQuestion.correct_answer) return null;
                const isCurrentTabOpen = activeBlueprintTab === key;
                
                return (
                  <div key={key} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      onClick={() => setActiveBlueprintTab(isCurrentTabOpen ? null : key)}
                      style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: selectedOption === key ? '#ffebee' : '#fff', fontSize: '13px' }}
                    >
                      <span><strong>Option {key}:</strong> {value.length > 45 ? value.substring(0, 45) + "..." : value}</span>
                      <span style={{ fontSize: '11px', color: '#1976d2', fontWeight: 'bold' }}>
                        {isCurrentTabOpen ? "Collapse ▴" : "View Trap Details ▾"}
                      </span>
                    </div>
                    
                    {isCurrentTabOpen && (
                      <div style={{ padding: '12px', background: '#fafafa', borderTop: '1px solid #eee', fontSize: '13px', color: '#555', lineHeight: '1.4', fontStyle: 'italic' }}>
                        {currentQuestion.option_traps && currentQuestion.option_traps[key] 
                          ? currentQuestion.option_traps[key] 
                          : "Alternative distractor built to divert attention by leveraging structural familiarity."}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ANALYSIS 4: REALITY REVEAL PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <div style={{ padding: '10px', background: '#ffebee', border: '1px solid #ef5350', borderRadius: '4px', fontSize: '14px', color: '#c62828' }}>
              ❌ <strong>Your Selection:</strong> Option {selectedOption} - {currentQuestion.options && currentQuestion.options[selectedOption]}
            </div>
            <div style={{ padding: '10px', background: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '4px', fontSize: '14px', color: '#2e7d32' }}>
              ✅ <strong>Correct Matrix Target:</strong> Option {currentQuestion.correct_answer} - {currentQuestion.options && currentQuestion.options[currentQuestion.correct_answer]}
            </div>
          </div>

          {/* DECONSTRUCTION INPUT */}
          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>
              Deconstruct the trap network to unlock the interface:
            </label>
            <input 
              type="text" 
              placeholder="Type your strategic rule to avoid this in the future..." 
              value={justification} 
              onChange={(e) => setJustification(e.target.value)} 
              style={{ padding: "12px", fontSize: "14px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" }} 
            />
            <button type="submit" style={{ padding: "12px", background: "red", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}>
              Log Error & Break Lockdown
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
