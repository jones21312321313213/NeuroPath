## Summary
When editing Section B (Difficulties, Barriers, and Enabling Supports) of an existing IEP in the View IEP tab, renaming an existing difficulty (for example, renaming "Difficulty in Remembering/Understanding" to "test") or deleting a difficulty row results in the old difficulty still being retained in the student profile alongside the renamed/new difficulty. This is caused by additive set union logic (`[...existing_markers, ...raw_difficulties]`) instead of directly replacing the student's difficulty markers with the active, sanitized list from Section B.

## Requirements (list the requirements for this task)
- [ ] Requirement 1: Replace additive union merge logic with direct sanitized list synchronization (`sanitizeDifficulties(rows)`) when saving edited Section B rows.
- [ ] Requirement 2: Ensure renaming an existing difficulty replaces the old difficulty name in the student's profile without increasing the difficulty count or creating duplicate rows.
- [ ] Requirement 3: Ensure removing a difficulty row in Section B removes that difficulty from the student's profile difficulty markers and future IEP generation flows.
- [ ] Requirement 4: Synchronize both backend (`IEPEditAPIView.perform_update`) and frontend (`handleUpdateIep` / TanStack Query cache).

## Screenshots (if applicable, add screenshots from base44)
N/A

## Related User Stories
- As a SPED Teacher, when I edit/rename a difficulty or delete an unwanted difficulty row in an IEP, I want the student's profile to accurately reflect only the current difficulties without retaining obsolete or renamed entries.

## Acceptance Criteria
- Renaming an existing difficulty row in Section B replaces the old difficulty in the student profile and reflects immediately in the Generate IEP tab upon navigation.
- Deleting a difficulty row in Section B removes it from the student profile and future IEP generation.
- Automated tests in `IepGenerationPage.test.jsx` and `test_iep_diff_sync.py` verify replacement and deduplication.

## Definition of done
- Issue resolved, verified with 100% test pass rate, and merged into `development`.
