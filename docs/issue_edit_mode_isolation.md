## Summary
When a teacher clicks "EDIT IEP" in the View IEP Panel, the editable form panel is rendered alongside all the uneditable/read-only sections (Section A metadata, Post-IEP classroom tools next-step card, Section B read-only table, Section C goal table, and the top Edit/Delete action buttons). This creates visual clutter and confusion. In Edit Mode, the view should exclusively display the editable form interface until the user clicks "SAVE CHANGES" or "CANCEL".

## Requirements (list the requirements for this task)
- [ ] Requirement 1: When `isEditing === true`, hide the top "EDIT IEP" / "DELETE IEP" action buttons, Post-IEP Next Steps card, read-only Considerations of Special Factors block, read-only Section B table, and read-only Section C goal table.
- [ ] Requirement 2: Display an active "Editing IEP" header indicator while in Edit Mode with clear "SAVE CHANGES" and "CANCEL" footer action buttons.
- [ ] Requirement 3: Restoring read-only view cleanly upon clicking "SAVE CHANGES" or "CANCEL" without leaving lingering edit state or layout artifacts.

## Screenshots (if applicable, add screenshots from base44)
N/A

## Related User Stories
- As a SPED Teacher, when I edit an existing IEP, I want an uncluttered, focused editing workspace so that I don't get confused between the editable fields and the old read-only data.

## Acceptance Criteria
- Clicking "EDIT IEP" hides all read-only tables and cards, displaying exclusively the edit form controls.
- Clicking "CANCEL" reverts state and restores the full read-only view with original data.
- Clicking "SAVE CHANGES" persists modifications and returns to the updated read-only view.
- Unit tests verify the uneditable sections are not in the DOM during edit mode.

## Definition of done
- Implementation merged with 100% test coverage and zero regression in `IepGenerationPage.test.jsx`.
