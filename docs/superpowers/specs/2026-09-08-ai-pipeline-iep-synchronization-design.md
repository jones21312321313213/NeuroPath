# AI Pipeline Resilience, IEP Factor Integration, and Cross-Tab Goal Synchronization Design

**Date**: 2026-09-08  
**Author**: Senior Software Engineer  
**Status**: Revised with User Feedback (Active Spec)  
**Scope**: neuropath-backend and neuropath-frontend

---

## 1. Executive Summary

This design addresses three critical areas across the NeuroPath application:
1. **Ollama Connection Failure**: Student Insights, Lesson Plans, and Teaching Strategies fail when the local Ollama daemon is offline or inaccessible.
2. **Special Factor Notes Integration**: Rather than discarding Other special factor notes, we explicitly elevate it into a first-class input that directly conditions AI goal synthesis, IEP persistence/viewing, and classroom instructional support generation.
3. **Classroom Instructional Support Retrieval Failure**: Tabs under Instructional Support (ManageLessonPlans, ManageTeachingStrategies, and ManageVisualAids) display empty goal states, blocking instructional generation.

---

## 2. Detailed Technical Design

### Issue 1: Unified AI Provider Gateway (AIEngineService)
Create neuropath-backend/iep_management/ai_engine.py:
- Implements an automatic resilient cascade:
  1. Local Ollama (llama3.2:3b, timeout: 3s).
  2. Cloud Groq API (llama-3.1-8b-instant, using settings.GROQ_API_KEY).
  3. Deterministic Pedagogical Template Fallback (coherent structured fallback when offline or unconfigured).
- Re-wire all callers:
  - AIGenerationService.generate_and_save_summary (Student Insights)
  - GenerateIEPGoalsFromIEPView (IEP Section C goal generator)
  - TeachingStrategyGenerationService.generate_and_save_strategy (Teaching Strategies)
  - LessonPlanGenerationService.execute_generation (Lesson Plans)

### Issue 2: First-Class Integration of Other Special Factor Notes
Per form standards, Other special factor notes is an essential component of the official IEP structure (covering behavioral, communication, and sensory considerations). We will integrate it end-to-end:
- Frontend Form (IepGenerationPage.jsx):
  - Keep TextAreaField label Other special factor notes.
  - Pass special_factor_notes: form.specialFactorNotes in the payload to iepAPI.generateGoalsFromIep.
  - Persist specialFactorNotes in generatedDetails during IEP save/update.
  - Display Other special factor notes in the View and Edit modes under Considerations of Special Factors.
- Backend Goal Generation (GenerateIEPGoalsFromIEPView):
  - Extract special_factor_notes from request payload.
  - Incorporate it into student_context and LLM prompts:
    Special Factors / Behavioral & Sensory Notes: {special_factor_notes}.
  - Ensures the generated annual goals and objective rows specifically account for the student documented special factors.
- Instructional Support Integration:
  - In TeachingStrategyGenerationService and LessonPlanGenerationService, retrieve special_factor_notes from the parent IEP to guide tailored pedagogical accommodations.

### Issue 3: Cross-Tab IEP Goal Synchronization
In neuropath-backend/iep_management/views.py:
- Update StandaloneIEPGoalViewSet.get_queryset:
  - When student_id is queried, check the student latest IEP.
  - If goals exist in generatedDetails (legacy or freshly generated), invoke _sync_goals_from_generated_details(latest_iep) to ensure normalized IEPGoal rows exist.
  - Support ?latest=true filtering so only active goals from the latest IEP version are returned.
- Standardize goal loading in ManageVisualAids.jsx, ManageLessonPlans.jsx, and ManageTeachingStrategies.jsx.
- Add a manual + Add Custom Goal option in Section C of IepGenerationPage.jsx so teachers can also manually add/edit goals if desired.
