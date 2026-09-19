## Summary
When editing Section B (Difficulties, Barriers, and Enabling Supports) of an existing IEP in the View IEP tab, teachers can add new difficulty rows. However, upon saving the IEP and navigating to "Generate IEP" for that same student, the newly added difficulties do not appear in the student's difficulty markers list. Section B difficulty updates should sync to the student's profile difficulty list so subsequent IEP generation flows reflect the learner's updated difficulties.

## Requirements (list the requirements for this task)
- [ ] Requirement 1: When saving an edited IEP in Section B with newly added difficulty rows, update the student's profile difficulties (or sync via `studentsAPI.update` / backend IEP save hook) to include the new difficulty items.
- [ ] Requirement 2: Update the frontend client state / TanStack Query cache for the selected student so the updated difficulties appear immediately when navigating to "Generate IEP" without requiring a page refresh.
- [ ] Requirement 3: Deduplicate difficulties so existing markers are not duplicated when syncing from Section B rows.

## Screenshots (if applicable, add screenshots from base44)
N/A

## Related User Stories
- As a SPED Teacher, when I identify and add a new difficulty while reviewing/editing a student's IEP, I want that difficulty to be saved to the student's profile so that future IEPs automatically include it.

## Acceptance Criteria
- Adding a new difficulty row in Edit IEP Section B and saving updates the student's profile difficulty list.
- Navigating to the Generate IEP tab for that student immediately renders the newly added difficulty in the profile-synced difficulties list.
- Automated tests in `IepGenerationPage.test.jsx` verify difficulty synchronization between Edit IEP and Generate IEP tabs.

## Definition of done
- Frontend and backend synchronization verified with automated tests passing and merged into `development`.
