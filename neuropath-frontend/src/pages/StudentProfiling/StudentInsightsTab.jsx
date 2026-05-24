import { useState } from "react";
import "../../styles/StudentInsight.css";

export default function StudentInsightsTab({ studentId }) {
  const [insights, setInsights] = useState(studentId === 4 ? mockInsights : []);
  const [generating, setGenerating] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const newInsight = {
        timestamp: new Date().toISOString(),
        sections: {
          strengths: [
            "New strength insight generated for demo.",
            "This is mock data until backend is ready."
          ],
          challenges: [
            "New challenge insight generated for demo."
          ],
          recommendations: [
            "Provide structured activities.",
            "Encourage peer collaboration."
          ]
        }
      };
      setInsights(prev => [...prev, newInsight]);
      setGenerating(false);
    }, 1500);
  };

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="tab-content">
      <section className="form-section">
        <h2 className="form-section-title">Generated AI Insights</h2>

        {/* Insights display */}
        {insights.length === 0 ? (
          <p className="placeholder-page">
            No insights yet. Click the button below to generate.
          </p>
        ) : (
          <div className="insight-history">
            {insights.map((entry, idx) => (
              <div key={idx} className="accordion-block">
                <button
                  className="accordion-header"
                  onClick={() => toggleAccordion(idx)}
                >
                  Generation {idx + 1} — {new Date(entry.timestamp).toLocaleString()}
                  <span className="accordion-icon">
                    {openIndex === idx ? "▲" : "▼"}
                  </span>
                </button>

                {openIndex === idx && (
                  <div className="accordion-content">
                    <div className="insight-row">
                      <div className="insight-card strengths">
                        <h5>Strengths</h5>
                        <ul>
                          {entry.sections.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>

                      <div className="insight-card challenges">
                        <h5>Challenges</h5>
                        <ul>
                          {entry.sections.challenges.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>

                      <div className="insight-card recommendations">
                        <h5>Recommendations</h5>
                        <ul>
                          {entry.sections.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Generate button moved to bottom */}
        <div className="form-actions" style={{ justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            className="btn btn-submit"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate and Analyze"}
          </button>
        </div>
      </section>
    </div>
  );
}

// Mock data with 2 generations
const mockInsights = [
  {
    timestamp: "2026-05-24T21:00:00Z",
    sections: {
      strengths: [
        "John shows strong interest in visual learning activities.",
        "He engages well with structured routines."
      ],
      challenges: [
        "Struggles with sensory overload in noisy environments.",
        "Needs support in peer interactions."
      ],
      recommendations: [
        "Provide a quiet workspace and sensory breaks.",
        "Encourage small group activities to build social skills."
      ]
    }
  },
  {
    timestamp: "2026-05-20T14:30:00Z",
    sections: {
      strengths: [
        "John demonstrates persistence in problem-solving tasks."
      ],
      challenges: [
        "Difficulty transitioning between activities."
      ],
      recommendations: [
        "Use visual schedules to ease transitions.",
        "Offer positive reinforcement for task completion."
      ]
    }
  }
];
