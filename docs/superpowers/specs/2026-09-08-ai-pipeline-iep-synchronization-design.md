# AI Pipeline Resilience, IEP Factor Optimization, and Cross-Tab Goal Synchronization Design

**Date**: 2026-09-08  
**Author**: Senior Software Engineer  
**Status**: Draft (Approved for Plan Generation)  
**Scope**: neuropath-backend and neuropath-frontend

---

## 1. Executive Summary

This design addresses three critical issues across the NeuroPath application:
1. **Ollama Connection Failure**: Student Insights, Lesson Plans, and Teaching Strategies fail when the local Ollama daemon is offline or inaccessible.
2. **IEP Form Input Redundancy**: In IepGenerationPage.jsx, inputs such as 'Other special factor notes' and certain profile fields are collected, stored in JSON, but completely ignored by AI generation prompts and database models.
3. **Classroom Instructional Support Retrieval Failure**: Tabs under Instructional Support (ManageLessonPlans, ManageTeachingStrategies, and ManageVisualAids) display empty goal states, blocking instructional generation.

---

## 2. Detailed Technical Design

### Issue 1: Unified AI Provider Gateway (AIEngineService)
Create 
europath-backend/iep_management/ai_engine.py:
- Implements an automatic cascade:
  1. Local Ollama (model: llama3.2:3b, timeout: 3s).
  2. Cloud Groq API (model: llama-3.1-8b-instant, using settings.GROQ_API_KEY).
  3. Deterministic Pedagogical Template Fallback (coherent structured fallback when offline or unconfigured).
- Re-wire all callers:
  - AIGenerationService.generate_and_save_summary (Student Insights)
  - GenerateIEPGoalsFromIEPView (IEP Section C goal generator)
  - TeachingStrategyGenerationService.generate_and_save_strategy (Teaching Strategies)
  - LessonPlanGenerationService.execute_generation (Lesson Plans)

### Issue 2: Pruning Redundant IEP Form Factors
In 
europath-frontend/src/pages/IepGenerationPage.jsx:
- Remove Other special factor notes (orm.specialFactorNotes) and clean up the form state and payload.
- Retain only high-signal pedagogical factors:
  - Primary Goal Area (Domain)
  - Difficulties & Section B Barrier Rows (Qualifiers, Facilitators, Accommodations, Assistive Technologies)
  - Teacher Instructions Directive
- Add a manual '+ Add Custom Goal' option in Section C so teachers are never blocked even when offline.

### Issue 3: Cross-Tab IEP Goal Synchronization
In 
europath-backend/iep_management/views.py:
- Update StandaloneIEPGoalViewSet.get_queryset:
  - When student_id is queried, check the student's latest IEP.
  - If goals exist only in generatedDetails, invoke _sync_goals_from_generated_details(latest_iep).
  - Support ?latest=true filtering.
- Standardize goal loading in ManageVisualAids.jsx, ManageLessonPlans.jsx, and ManageTeachingStrategies.jsx.
