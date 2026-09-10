import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/StudentInsight.css";
import {
  useStudentInsights,
  useGenerateStudentInsight,
} from "../../hooks/queries";
import { Callout, Button, EmptyState } from "../../components/ui";

const USE_MOCK_INSIGHTS = import.meta.env.VITE_USE_MOCK_INSIGHTS === "true";

export default function StudentInsightsTab({ studentId, setActivePage }) {
  const navigate = useNavigate();
  const isDemo = Boolean(
    import.meta.env.VITE_USE_MOCK_INSIGHTS === "true" || USE_MOCK_INSIGHTS
  );

  const [demoInsights, setDemoInsights] = useState(mockInsights);
  const [demoGenerating, setDemoGenerating] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);
  const [error, setError] = useState(null);

  const {
    data: queryInsights,
    isLoading,
    isError: isQueryError,
    error: queryError,
  } = useStudentInsights(studentId, {
    enabled: !isDemo && Boolean(studentId),
  });

  const generateMutation = useGenerateStudentInsight(studentId, {
    onSuccess: () => {
      setOpenIndex(0);
    },
    onError: (err) => {
      setError(err?.message || "Failed to generate summary.");
    },
  });

  const insights = isDemo ? demoInsights : queryInsights || [];
  const isGenerating = isDemo ? demoGenerating : generateMutation.isPending;
  const errorMessage =
    error ||
    (isQueryError ? queryError?.message || "Failed to load insights." : null) ||
    (generateMutation.isError
      ? generateMutation.error?.message || "Failed to generate summary."
      : null);

  const handleGenerate = async () => {
    setError(null);
    if (generateMutation.reset) {
      generateMutation.reset();
    }

    if (isDemo) {
      setDemoGenerating(true);
      const mockNew = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        summary_text:
          "Ethan Carter demonstrates high affinity for tactile spatial modules and mathematical patterns. However, he encounters processing delays with multi-sentence contexts. It is highly recommended to present text blocks inside short, discrete structural segments while managing structural auditory breaks.",
      };
      setDemoInsights((prev) => [mockNew, ...prev]);
      setDemoGenerating(false);
      setOpenIndex(0);
      return;
    }

    try {
      await generateMutation.mutateAsync();
      setOpenIndex(0);
    } catch (err) {
      setError(err?.message || "Failed to generate summary.");
    }
  };

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="tab-content">
      <section className="form-section">
        <h2 className="form-section-title">Quick Student Summary</h2>

        {/* --- DISTINCTION & NOTICE BANNER --- */}
        <div className="summary-disclaimer-box">
          <div className="summary-disclaimer-content">
            <span className="summary-disclaimer-icon" aria-hidden="true">
              ℹ️
            </span>
            <div>
              <p className="summary-disclaimer-text">
                <strong>Quick Student Summary:</strong> Provides an immediate
                AI-assisted profile overview of student strengths, needs, and
                accommodations for quick reference.
              </p>
              <p className="summary-disclaimer-sub">
                ⚠️{" "}
                <em>
                  Note: This is not a full Individualized Education Program
                  (IEP). To create comprehensive annual goals, accommodations,
                  and service schedules, use the full IEP generator.
                </em>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-go-iep"
            onClick={() => {
              if (studentId) {
                navigate(`/dashboard/students/${studentId}/iep`);
              } else {
                navigate("/dashboard/iep/generate");
              }
              if (setActivePage) setActivePage("iep-generation");
            }}
          >
            Go to Generate IEP →
          </button>
        </div>

        {errorMessage && (
          <Callout variant="error" className="error-banner mb-4">
            {errorMessage}
          </Callout>
        )}

        {/* --- INSIGHT DISPLAY LIST --- */}
        {isLoading && !isDemo ? (
          <p className="placeholder-page">Loading summary history...</p>
        ) : insights.length === 0 ? (
          <EmptyState
            title="No AI insights yet"
            description="No quick summary generated yet. Generate an AI-powered summary to analyze student learning patterns."
          />
        ) : (
          <div className="insight-history">
            {insights.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="accordion-block"
                style={{ marginBottom: "10px" }}
              >
                <button
                  className="accordion-header"
                  onClick={() => toggleAccordion(idx)}
                  type="button"
                >
                  Summary {insights.length - idx} — {entry.timestamp}
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
                        textAlign: "justify",
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
        <div
          className="form-actions"
          style={{ justifyContent: "flex-end", marginTop: "20px" }}
        >
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-submit"
          >
            {isGenerating ? "Analyzing Profile..." : "Generate Quick Summary"}
          </Button>
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
    summary_text:
      "John demonstrates a strong affinity for visual learning frameworks and responds exceptionally well to predictable, structured schedules. However, he encounters significant obstacles managing processing loops in high-stimulus, noisy settings, which can impair group integration. Providing consistent access to specialized quiet zones and small-group pairings optimizes his overall transition stamina and communication progress.",
  },
  {
    id: 102,
    timestamp: "2026-05-20 14:30",
    summary_text:
      "John displays high task persistence when interacting with logical problem-solving components. His primary processing block occurs when shifting rapidly between disconnected academic tracks without explicit visual milestones. Integrating targeted visual timelines and deploying positive token validation effectively eases performance friction during scheduling shifts.",
  },
];