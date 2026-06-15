import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize Supabase Connection
const SUPABASE_URL = "https://zivoqvmjjguvtgvrdorx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppdm9xdm1qamd1dnRndnJkb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ0MDQ5NCwiZXhwIjoyMDk3MDE2NDk0fQ.wfl_fJD5QCVdJxgz6DVC5gdG_KLKaldtg_uKW6OSZ70";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false); 
  const [savedLogs, setSavedLogs] = useState([]); 

  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [trapData, setTrapData] = useState(null);
  const [justification, setJustification] = useState("");
  
  const [activeBlueprintTab, setActiveBlueprintTab] = useState(null);
  const [showHint, setShowHint] = useState(false); 

  const [score, setScore] = useState(0);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const { data, error } = await supabase.from("prelims_pyqs").select("*").order("id", { ascending: true });
        if (error) throw error;
        if (data) setQuestions(data);
      } catch (error) {
        console.error("Database Error:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  const fetchErrorLogs = async () => {
    try {
      const { data, error } = await supabase.from("user_error_logs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setSavedLogs(data);
    } catch (error) {
      console.error("Logs Error:", error);
    }
  };

  const toggleReviewMode = () => {
    if (!isReviewMode) fetchErrorLogs(); 
    setIsReviewMode(!isReviewMode);
  };

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

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (justification.trim().length < 10) {
      alert("Reflect deeply on the structural trap to unlock.");
      return;
    }
    try {
      await supabase.from("user_error_logs").insert([{
        question_id: questions[currentIdx].id,
        micro_topic_id: questions[currentIdx].micro_topic_id,
        original_trap: questions[currentIdx].trap_explanation,
        user_rule: justification,
      }]);
    } catch (err) { console.error("Save Error:", err); }

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
    setShowHint(false); 
  };

  if (isLoading) return <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}><h2>Initializing Neural Engine...</h2></div>;

  if (questions.length === 0 || currentIdx >= questions.length) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif" }}>
        <h2>Session Complete!</h2>
        <p>Total Score: <strong>{(score - negativeMarks).toFixed(2)}</strong></p>
        <button onClick={toggleReviewMode} style={{ marginTop: '20px', padding: '10px 20px', background: '#000', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          {isReviewMode ? "Close Survival Guide" : "📖 Open Full Survival Guide"}
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  // --- SURVIVAL GUIDE DASHBOARD ---
  if (isReviewMode) {
    return (
      <div style={{ fontFamily: "sans-serif", maxWidth: "700px", margin: "40px auto", padding: "20px" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>🧠 My Survival Guide</h2>
          <button onClick={toggleReviewMode} style={{ padding: '8px 16px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back to Test</button>
        </div>
        {savedLogs.length === 0 ? <p>No errors logged yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {savedLogs.map((log) => (
              <div key={log.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
                <span style={{ fontSize: '11px', background: '#eee', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{log.micro_topic_id}</span>
                <div style={{ marginTop: '10px', fontSize: '14px', color: '#555' }}><strong>Trap:</strong> {log.original_trap}</div>
                <div style={{ marginTop: '10px', fontSize: '15px', color: '#b71c1c', background: '#ffebee', padding: '10px', borderLeft: '3px solid #f44336', borderRadius: '4px' }}>
                  <strong>My Rule:</strong> "{log.user_rule}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- MAIN TEST INTERCEPTOR UI ---
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "650px", margin: "40px auto", padding: "20px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
         <button onClick={toggleReviewMode} style={{ padding: '6px 12px', background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📖 Open Survival Guide</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", paddingBottom: "10px", borderBottom: "2px solid #eee", fontSize: "14px" }}>
        <div><strong>Score:</strong> <span style={{ color: "green" }}>+{score.toFixed(2)}</span></div>
        <div><strong>Status:</strong> {isLocked ? <span style={{ color: "red", fontWeight: "bold" }}>LOCKED</span> : <span style={{ color: "green" }}>ACTIVE</span>}</div>
        <div><strong>Negative:</strong> <span style={{ color: "red" }}>-{negativeMarks.toFixed(2)}</span></div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px", fontSize: "11px", textTransform: "uppercase", flexWrap: "wrap" }}>
        <span style={{ background: "#eee", padding: "4px 8px", borderRadius: "4px" }}>{currentQuestion.micro_topic_id}</span>
        <span style={{ background: currentQuestion.difficulty_tier === 3 ? "#ffebee" : "#fff3e0", color: currentQuestion.difficulty_tier === 3 ? "#c62828" : "#e65100", padding: "4px 8px", borderRadius: "4px" }}>Tier {currentQuestion.difficulty_tier} Trap</span>
      </div>

      <div><p style={{ fontSize: "16px", lineHeight: "1.6", whiteSpace: "pre-wrap", marginTop: "10px", marginBottom: "15px" }}>{currentQuestion.question_text}</p></div>

      {currentQuestion.key_hint && !isAnswered && !isLocked && (
        <div style={{ marginBottom: "20px" }}>
          <button onClick={() => setShowHint(!showHint)} style={{ background: "none", border: "none", color: "#0288d1", cursor: "pointer", fontSize: "13px", fontWeight: "bold", padding: 0 }}>
            {showHint ? "🙈 Hide Key Hint" : "💡 Reveal Key Hint"}
          </button>
          {showHint && <div style={{ marginTop: "8px", padding: "12px", background: "#e1f5fe", borderLeft: "4px solid #0288d1", borderRadius: "4px", fontSize: "14px", color: "#01579b" }}><strong>Hint:</strong> {currentQuestion.key_hint}</div>}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
        {currentQuestion.options && Object.entries(currentQuestion.options).map(([key, value]) => {
          let buttonStyle = { padding: "12px", textAlign: "left", background: "#fff", border: "1px solid #ccc", borderRadius: "6px", cursor: isLocked || isAnswered ? "not-allowed" : "pointer", fontSize: "15px", width: "100%" };
          if (selectedOption === key) { buttonStyle.border = "2px solid #000"; buttonStyle.background = "#f0f0f0"; }
          if (isAnswered && !isLocked && key === currentQuestion.correct_answer) { buttonStyle.border = "2px solid green"; buttonStyle.background = "#e8f5e9"; }
          return <button key={key} disabled={isLocked || isAnswered} onClick={() => handleOptionClick(key)} style={buttonStyle}><strong>{key}.</strong> {value}</button>;
        })}
      </div>

      {isAnswered && !isLocked && currentQuestion.explanation && (
        <div style={{ marginTop: "25px", padding: "18px", background: "#f9f9f9", border: "1px solid #e0e0e0", borderRadius: "6px", borderLeft: "4px solid #4caf50" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "15px", color: "#2e7d32" }}>📖 Academic Explanation</h4>
          <p style={{ fontSize: "14.5px", color: "#333", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" }}>{currentQuestion.explanation}</p>
        </div>
      )}

      {isAnswered && !isLocked && (
        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <button onClick={handleNext} style={{ padding: "10px 20px", background: "#000", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Next Question</button>
        </div>
      )}

      {isLocked && trapData && (
        <div style={{ marginTop: '30px', padding: '25px', borderRadius: '8px', border: '3px solid red', background: '#fff', boxShadow: '0 4px 12px rgba(255,0,0,0.15)' }}>
          <h2 style={{ color: 'red', marginTop: 0, fontSize: '20px', marginBottom: '20px' }}>⚠️ CRITICAL LOGIC ERROR DETECTED</h2>
          
          <div style={{ background: '#fff5f5', padding: '15px', borderRadius: '6px', borderLeft: '4px solid red', marginBottom: '15px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#c62828', display: 'block', marginBottom: '5px' }}>🚨 TRIGGERED TRAP</span>
            <p style={{ fontSize: '15px', color: '#333', lineHeight: '1.5', margin: 0 }}>
              {currentQuestion.option_traps && currentQuestion.option_traps[selectedOption] ? currentQuestion.option_traps[selectedOption] : currentQuestion.trap_explanation}
            </p>
          </div>

          <div style={{ background: '#f0f4f8', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #1976d2', marginBottom: '15px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1565c0', display: 'block', marginBottom: '5px' }}>📐 DESIGN BLUEPRINT</span>
            <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.5', margin: 0 }}>{currentQuestion.trap_explanation}</p>
          </div>

          <div style={{ background: '#f5f7fa', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #455a64', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#455a64', display: 'block', marginBottom: '12px' }}>🔍 ALTERNATIVE DISTRACTORS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentQuestion.options && Object.entries(currentQuestion.options).map(([key, value]) => {
                if (key === currentQuestion.correct_answer) return null;
                const isCurrentTabOpen = activeBlueprintTab === key;
                return (
                  <div key={key} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                    <div onClick={() => setActiveBlueprintTab(isCurrentTabOpen ? null : key)} style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', background: selectedOption === key ? '#ffebee' : '#fff', fontSize: '13px' }}>
                      <span><strong>Option {key}:</strong> {value.length > 45 ? value.substring(0, 45) + "..." : value}</span>
                      <span style={{ fontSize: '11px', color: '#1976d2', fontWeight: 'bold' }}>{isCurrentTabOpen ? "Collapse ▴" : "View Details ▾"}</span>
                    </div>
                    {isCurrentTabOpen && (
                      <div style={{ padding: '12px', background: '#fafafa', borderTop: '1px solid #eee', fontSize: '13px', color: '#555', fontStyle: 'italic' }}>
                        {currentQuestion.option_traps && currentQuestion.option_traps[key] ? currentQuestion.option_traps[key] : "Alternative distractor."}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleUnlock} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontWeight: "bold", fontSize: "14px" }}>Deconstruct the trap network to unlock:</label>
            <input type="text" placeholder="Type your strategic rule..." value={justification} onChange={(e) => setJustification(e.target.value)} style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", width: "100%" }} />
            <button type="submit" style={{ padding: "12px", background: "red", color: "white", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}>Log Error & Break Lockdown</button>
          </form>
        </div>
      )}
    </div>
  );
}
