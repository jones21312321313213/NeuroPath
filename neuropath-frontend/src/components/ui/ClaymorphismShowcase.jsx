import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";
import {
  SparklesIcon,
  CheckIcon,
  UserIcon,
  InfoIcon,
  AcademicCapIcon,
  DocumentIcon,
  ClipboardIcon,
} from "./icons";

export function ClaymorphismShowcase() {
  const { theme } = useTheme();
  const [inputText, setInputText] = useState("Sample NeuroPath text field");
  const [selectOption, setSelectOption] = useState("option1");
  const [activeTab, setActiveTab] = useState("students");
  const [textareaText, setTextareaText] = useState(
    "Claymorphic surfaces use rounded corners, soft drop shadows, and subtle inner highlights for a tactile 3D feel."
  );

  const brandSwatches = [
    { label: "Brand Primary", hex: "#5aabf0", color: "#ffffff", border: false },
    { label: "Brand Action", hex: "#3d9de8", color: "#ffffff", border: false },
    { label: "Deep Shadow Anchor", hex: "#1e6fbf", color: "#ffffff", border: false },
    { label: "Page Background", hex: "#f0f4f9", color: "#1e293b", border: true },
    { label: "Card Surface", hex: "#ffffff", color: "#1e293b", border: true },
    { label: "Primary Text", hex: "#1e293b", color: "#ffffff", border: false },
    { label: "Secondary Text", hex: "#64748b", color: "#ffffff", border: false },
    { label: "Focus Ring", hex: "#0284c7", color: "#ffffff", border: false },
  ];

  return (
    <div className="clay-showcase-container p-6 flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <section className="clay-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="clay-pill clay-pill-primary text-xs font-bold uppercase tracking-wider">
              Issue #185 Spike
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Active Theme: <strong className="text-slate-800 capitalize">{theme}</strong>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Claymorphism Style System Prototype
          </h1>
          <p className="text-slate-600 mt-1 max-w-2xl text-sm md:text-base leading-relaxed">
            A tactile, soft 3D design system inspired by modern Pinterest and Michal Malewicz
            aesthetic principles: generous radii (16px to 24px), dual-shadow depth, pill-shaped
            tactile depression, and strict WCAG 2.1 AA accessibility.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="clay-pill clay-pill-primary text-xs font-bold py-1.5 px-4">
            Claymorphism Active System-Wide
          </span>
        </div>
      </section>

      {/* Pinterest-Inspired Stat Tiles */}
      <section aria-labelledby="stats-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 id="stats-heading" className="text-lg font-bold text-slate-900">
            Tactile Metric Widgets
          </h2>
          <span className="text-xs text-slate-500">Inflated 3D tiles with interactive hover elevation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="clay-stat-tile">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
                <AcademicCapIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="clay-pill text-xs font-bold text-sky-700 bg-sky-50">+2 this month</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">24</span>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Enrolled SPED Students</p>
            </div>
            <div className="clay-progress-track">
              <div className="clay-progress-bar" style={{ width: "75%" }} />
            </div>
          </div>

          <div className="clay-stat-tile">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                <ClipboardIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="clay-pill text-xs font-bold text-indigo-700 bg-indigo-50">88% on track</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">42</span>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Active IEP Milestones</p>
            </div>
            <div className="clay-progress-track">
              <div className="clay-progress-bar" style={{ width: "88%" }} />
            </div>
          </div>

          <div className="clay-stat-tile">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                <DocumentIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="clay-pill text-xs font-bold text-emerald-700 bg-emerald-50">Updated today</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">16</span>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Lesson Plan Strategies</p>
            </div>
            <div className="clay-progress-track">
              <div className="clay-progress-bar" style={{ width: "94%" }} />
            </div>
          </div>
        </div>
      </section>

      {/* Brand Color Palette */}
      <section aria-labelledby="palette-heading" className="clay-card p-6 flex flex-col gap-4">
        <h2 id="palette-heading" className="text-lg font-bold text-slate-900">
          Exact Brand Palette
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {brandSwatches.map((swatch) => (
            <div
              key={swatch.label}
              className={`p-3 rounded-2xl flex flex-col justify-between text-left shadow-xs transition-transform hover:-translate-y-0.5 ${
                swatch.border ? "border border-slate-200" : ""
              }`}
              style={{
                backgroundColor: swatch.hex,
                color: swatch.color,
                minHeight: "92px",
              }}
            >
              <span className="text-xs font-semibold leading-tight">{swatch.label}</span>
              <span className="text-xs font-mono font-bold tracking-wider opacity-90">
                {swatch.hex}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pinterest-Style Segmented Navigation Tabs */}
      <section aria-label="Sample Navigation Tabs" className="clay-card p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tactile Segmented Controls</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Recessed clay gutter container with floating inflated active pill tab.
            </p>
          </div>

          <div className="clay-segmented-track" role="tablist" aria-label="Demo Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "students"}
              className={`clay-segment-pill ${activeTab === "students" ? "active" : ""}`}
              onClick={() => setActiveTab("students")}
            >
              Student Roster
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "ieps"}
              className={`clay-segment-pill ${activeTab === "ieps" ? "active" : ""}`}
              onClick={() => setActiveTab("ieps")}
            >
              Active IEPs
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "strategies"}
              className={`clay-segment-pill ${activeTab === "strategies" ? "active" : ""}`}
              onClick={() => setActiveTab("strategies")}
            >
              Instructional Aids
            </button>
          </div>
        </div>
      </section>

      {/* Sample Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sample Buttons Card */}
        <section aria-labelledby="buttons-heading" className="clay-card p-6 flex flex-col gap-5">
          <div>
            <h2 id="buttons-heading" className="text-lg font-bold text-slate-900">
              Sample Buttons
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Smooth pill shapes (border-radius: 9999px) with tactile active depression (scale: 0.98).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="clay"
              pill
              icon={<SparklesIcon className="w-4 h-4" aria-hidden="true" />}
            >
              Clay Primary Action
            </Button>

            <Button
              variant="clay-secondary"
              pill
              icon={<CheckIcon className="w-4 h-4 text-emerald-600" aria-hidden="true" />}
            >
              Clay Secondary Pill
            </Button>

            <button type="button" className="btn btn-submit">
              Standard Submit (.btn-submit)
            </button>

            <button type="button" className="btn btn-back">
              Standard Back (.btn-back)
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              States & Accessibility
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="clay" disabled>
                Disabled State
              </Button>

              <button
                type="button"
                className="clay-btn clay-btn-primary"
                aria-label="Direct utility primary button"
              >
                Direct .clay-btn Class
              </button>

              <button
                type="button"
                className="clay-btn clay-btn-secondary"
                aria-label="Direct utility secondary button"
              >
                Direct .clay-btn-secondary
              </button>
            </div>
          </div>
        </section>

        {/* Sample Form Inputs Card */}
        <section aria-labelledby="inputs-heading" className="clay-card p-6 flex flex-col gap-5">
          <div>
            <h2 id="inputs-heading" className="text-lg font-bold text-slate-900">
              Sample Input Fields
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generous 16px radius, recessed inner shadow, and accessible #0284c7 focus rings.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="form-group flex flex-col gap-1.5">
              <label htmlFor="sample-text-input" className="form-label text-sm font-semibold text-slate-800">
                Student Full Name:
              </label>
              <input
                id="sample-text-input"
                type="text"
                className="form-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter student name..."
              />
            </div>

            <div className="form-group flex flex-col gap-1.5">
              <label htmlFor="sample-select" className="form-label text-sm font-semibold text-slate-800">
                Grade / Learning Tier:
              </label>
              <select
                id="sample-select"
                className="form-select"
                value={selectOption}
                onChange={(e) => setSelectOption(e.target.value)}
              >
                <option value="option1">Tier 1 - General Classroom Support</option>
                <option value="option2">Tier 2 - Targeted Instructional Aid</option>
                <option value="option3">Tier 3 - Specialized Individualized Support</option>
              </select>
            </div>

            <div className="form-group flex flex-col gap-1.5">
              <label htmlFor="sample-textarea" className="form-label text-sm font-semibold text-slate-800">
                Behavioral & Sensory Observations:
              </label>
              <textarea
                id="sample-textarea"
                rows={3}
                className="form-textarea"
                value={textareaText}
                onChange={(e) => setTextareaText(e.target.value)}
                placeholder="Enter clinical observations..."
              />
            </div>
          </div>
        </section>
      </div>

      {/* Sample Form Card Showcase */}
      <section aria-labelledby="form-card-heading" className="form-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="form-card-heading" className="text-lg font-bold text-slate-900">
              Sample Form Card (.form-card)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dual-shadow technique combining outer soft shadow with white/blue inner highlights.
            </p>
          </div>
          <span className="clay-pill text-xs font-semibold">24px Radius</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="clay-card-interactive p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-600 font-bold text-sm mb-1">
                <InfoIcon className="w-4 h-4" aria-hidden="true" />
                Interactive Clay Card
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hover over this surface to inspect the smooth lift transition and composite highlight
                depth.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span>outer: 8px 8px 16px</span>
              <span>inner: 2px 2px 4px</span>
            </div>
          </div>

          <div className="clay-card p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-600 font-bold text-sm mb-1">
                <UserIcon className="w-4 h-4" aria-hidden="true" />
                Accessible Typography
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All primary text maintains #1e293b color on white surfaces for 12:1+ contrast ratio,
                far exceeding WCAG AA requirements.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-700">WCAG 2.1 AA Compliant</span>
            </div>
          </div>
        </div>

        <div className="form-actions flex items-center justify-between pt-4 border-t border-slate-100">
          <button type="button" className="btn btn-back">
            Cancel
          </button>
          <button type="button" className="btn btn-submit">
            Save Changes
          </button>
        </div>
      </section>

      {/* Topbar Preview Card */}
      <section aria-labelledby="topbar-heading" className="clay-card p-6 flex flex-col gap-4">
        <div>
          <h2 id="topbar-heading" className="text-lg font-bold text-slate-900">
            Sample Topbar Controls
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Claymorphic pill controls with rounded-full geometry and tactile click response.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Breadcrumb:</span>
            <span className="text-sm font-bold text-slate-800">DASHBOARD / Claymorphism Spike</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="clay-pill text-xs font-semibold text-slate-700 bg-white">
              Universal Theme: Claymorphism
            </span>

            <div className="topbar-pill" role="group" aria-label="Sample user profile pill">
              <div className="topbar-pill-avatar" aria-hidden="true">
                JD
              </div>
              <span className="topbar-pill-name">Teacher Jane</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ClaymorphismShowcase;
