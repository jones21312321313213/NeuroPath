import { useState, useEffect } from "react";
import "../../styles/StudentInsight.css";
import { iepAPI } from "../../api/client";

export default function StudentInsightsTab({ studentId }) {
  // Use studentId === 4 for mock data fallback, otherwise start empty or fetch from DB
  const [insights, setInsights] = useState(studentId === 4 ? mockInsights : []);
  const [generating, setGenerating] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const [error, setError] = useState(null);

  // 1. Fetch real historical insights from the backend on tab mount
  useEffect(() => {
      if (!studentId || studentId === 4) return;

      // 🎯 Use your client API instead of raw fetch
      iepAPI.getInsights(studentId)
        .then((data) => {
          const mappedData = data.map(item => ({
            id: item.id,
            timestamp: item.created_at, 
            summary_text: item.summary_text
          }));
          setInsights(mappedData);
        })
        .catch((err) => setError(err.message));
    }, [studentId]);
  

     // 2. Trigger the local AI text generation pipeline via Django
    const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    // Mock Behavior for testing without backend active
    if (studentId === 4) {
      setTimeout(() => {
        const mockNew = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          summary_text: "Ethan Carter demonstrates high affinity for tactile spatial modules and mathematical patterns. However, he encounters processing delays with multi-sentence contexts. It is highly recommended to present text blocks inside short, discrete structural segments while managing structural auditory breaks."
        };
        setInsights(prev => [mockNew, ...prev]); // Prepend to show the newest at the top
        setGenerating(false);
        setOpenIndex(0); // Auto-open the newest generation accordion
      }, 1500);
      return;
    }

    try {
      // 🎯 Use your client API instead of raw fetch
      const newInsight = await iepAPI.generateInsight(studentId);
      
      const formattedNewInsight = {
        id: newInsight.id,
        timestamp: newInsight.created_at,
        summary_text: newInsight.summary_text
      };

      setInsights(prev => [formattedNewInsight, ...prev]);
      setOpenIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };
 
  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="tab-content">
      <section className="form-section">
        <h2 className="form-section-title">Generated AI Insights</h2>

        {error && (
          <div className="error-banner" style={{ color: "#721c24", backgroundColor: "#f8d7da", padding: "12px", borderRadius: "6px", marginBottom: "15px", border: "1px solid #f5c6cb" }}>
            ⚠️ {error}
          </div>
        )}

        {/* --- INSIGHT DISPLAY LIST --- */}
        {insights.length === 0 ? (
          <p className="placeholder-page">
            No insights yet. Click the button below to generate a professional student summary.
          </p>
        ) : (
          <div className="insight-history">
            {insights.map((entry, idx) => (
              <div key={entry.id || idx} className="accordion-block" style={{ marginBottom: "10px" }}>
                <button
                  className="accordion-header"
                  onClick={() => toggleAccordion(idx)}
                  type="button"
                >
                  Generation {insights.length - idx} — {entry.timestamp}
                  <span className="accordion-icon">
                    {openIndex === idx ? "▲" : "▼"}
                  </span>
                </button>

                {/* --- SINGLE UNIFIED BOX OUTPUT --- */}
                {openIndex === idx && (
                  <div className="accordion-content" style={{ padding: "0" }}>
                    <div 
                      className="insight-summary-box"
                      style={{
                        padding: "20px",
                        backgroundColor: "#f8f9fa",
                        borderRadius: "0 0 8px 8px",
                        border: "1px solid #e9ecef",
                        borderTop: "none",
                        fontSize: "15px",
                        lineHeight: "1.6",
                        color: "#212529",
                        textAlign: "justify"
                      }}
                    >
                      {entry.summary_text}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* --- FORM ACTION GENERATE BUTTON --- */}
        <div className="form-actions" style={{ justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            className="btn btn-submit"
            onClick={handleGenerate}
            disabled={generating}
            type="button"
          >
            {generating ? "Analyzing Profile..." : "Generate and Analyze"}
          </button>
        </div>
      </section>
    </div>
  );
}

// Single-box unified history mock metrics
const mockInsights = [
  {
    id: 101,
    timestamp: "2026-05-24 21:00",
    summary_text: "John demonstrates a strong affinity for visual learning frameworks and responds exceptionally well to predictable, structured schedules. However, he encounters significant obstacles managing processing loops in high-stimulus, noisy settings, which can impair group integration. Providing consistent access to specialized quiet zones and small-group pairings optimizes his overall transition stamina and communication progress."
  },
  {
    id: 102,
    timestamp: "2026-05-20 14:30",
    summary_text: "John displays high task persistence when interacting with logical problem-solving components. His primary processing block occurs when shifting rapidly between disconnected academic tracks without explicit visual milestones. Integrating targeted visual timelines and deploying positive token validation effectively eases performance friction during scheduling shifts."
  }
];