# Teacher response alignment

NeuroPath learns a small, allow-listed set of response-style preferences from generation history: output format, level of detail, and tone. It does not learn student attributes, domains, facts, or arbitrary instructions. Only the aggregate labels and interaction count are stored on the teacher profile.

New IEP goal-generation requests update the profile from explicit teacher instructions. Existing generation logs can be reprocessed with the Django management command:

```sh
cd neuropath-backend
python manage.py refresh_alignment_profiles
```

Deployments that need periodic backfills can schedule this command with their platform scheduler. The online generation path updates the current teacher profile after each completed IEP draft request.

Aligned prompts include `<SYSTEM_GUARDRAILS>`, `<VERIFICATION_STEP>`, `<USER_PROFILE>`, and `<CURRENT_INPUT>` in priority order. Guardrails are also passed through the provider system-prompt channel. Profile values are checked against fixed enums before use, and user input is escaped before insertion into the XML-delimited template.
