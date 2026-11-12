export const RELEASE_NOTES = [
  {
    version: "v1.2.1",
    date: "November 2026",
    isLatest: true,
    summary:
      "Calendar & Schedules with automated milestone tracking, iPhone & mobile UX optimizations, notification persistence, and visual aid frame expansion.",
    changes: [
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Interactive Calendar & Schedules module with monthly grid navigation, DepEd Order No. 44 s. 2021 milestone tracking, student filtering, and custom event scheduling.",
      },
      {
        tag: "Automation",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Automated time-bound IEP milestone reminders (+30d Month 1, +60d Month 2, +90d Quarterly Review, and +365d Annual Renewal) generated upon saving IEPs, with active version supersede logic.",
      },
      {
        tag: "Mobile UX",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Comprehensive mobile UX refinements (tested on iPhone 12 Pro 390x844): responsive landing page hamburger menu, non-clashing elevated z-index modals, 2-column quick actions, and Section C table horizontal scrolling with 80% default fullscreen zoom.",
      },
      {
        tag: "Notifications",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Top bar notification bell with real-time unread counter, seen-state persistence across logins in localStorage, and one-click deadline completion.",
      },
      {
        tag: "Visual Aids",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Expanded task analysis visual aid image frames to 240px with centered framing, perfectly presenting 800x600 AI-generated sequential illustrations without vertical clipping.",
      },
    ],
  },
  {
    version: "v1.2.0",
    date: "November 2026",
    isLatest: false,
    summary:
      "Outcome Monitoring alignment, R-GORI pedagogical inspection, DepEd PDF export updates, and AI rate-limit resilience.",
    changes: [
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Interactive R-GORI Pedagogical Compliance Inspection dialog with 4-factor goal scoring in IEP draft reviews.",
      },
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Outcome Monitoring executive classroom KPIs, 70% target milestone benchmark lines, predictive trend forecasting, and behavioral observation logging.",
      },
      {
        tag: "Compliance",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Updated DepEd Student Record PDF template: relocated assessment matrix under Section B Special Factors, streamlined Page 1 demographics, and added Parent/Guardian sign-off block.",
      },
      {
        tag: "UI Polish",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Streamlined View IEP actions (inline Edit/Delete IEP, Archive Version beside date), 10-second AI regenerate cooldown, and clearer login rate-limit messaging.",
      },
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Sequential Task Analysis Visual Aids with multi-call AI image generation, dedicated step illustrations, and full-screen preview lightbox.",
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "October 2026",
    isLatest: false,
    summary:
      "Standardized resource exports, RA 10173 data privacy hardening, and multi-engine AI fallbacks.",
    changes: [
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Standardized PDF exports for Lesson Plans, Teaching Strategies, and Visual Aids.",
      },
      {
        tag: "Security",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "RA 10173 Data Privacy Act consent workflow and Fernet AES encryption at rest with resilient student name resolution.",
      },
      {
        tag: "UI Polish",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Interactive onboarding tutorial, session inactivity auto-logout warnings, and multi-tab synchronization.",
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "September 2026",
    isLatest: false,
    summary: "Initial production release of NeuroPath for Special Education teachers.",
    changes: [
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Core Student Profiling, AI-Assisted IEP Generation, Lesson Plan Builder, Teaching Strategies, and Visual Aid Studio.",
      },
    ],
  },
];

export const CURRENT_RELEASE_VERSION = RELEASE_NOTES[0]?.version || "v1.2.1";
