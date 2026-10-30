# Teacher alignment profile worker

Successful IEP goal generation requests are reduced to allow-listed metadata before they enter the alignment pipeline. The stored event contains only preference labels, broad teaching topics, recurring response needs, and a fixed task type; it never contains the source prompt or learner details.

Run the worker beside the Django web process:

```sh
cd neuropath-backend
python manage.py process_teacher_alignment_profiles --loop --poll-seconds 2
```

For a one-time drain (useful for local development and deployments that schedule short jobs), omit `--loop`:

```sh
python manage.py process_teacher_alignment_profiles
```

The worker rebuilds each teacher's profile from their safe event labels, updates evidence counts, and marks those events processed in one database transaction. A style preference becomes a default after at least two matching requests; its confidence advances from tentative to emerging, established, and strong as supporting interactions reach 2, 5, and 20. Topics and task patterns are exposed as recurring after at least two observations. Current instructions always override learned preferences. The worker can be run by more than one process; profile updates are serialized per teacher. If processing fails, the transaction leaves events pending for a later attempt.

The prompt profile is revalidated against the same allow-lists before use. Historical metadata is treated as untrusted context, the system guardrails remain higher priority, and topic labels may guide response context but must not be used as facts about an individual learner.

The current extractor learns presentation preferences (format, detail, and tone), common response needs (such as classroom-ready or progress-monitoring output), broad IEP domains, and task type. The source prompt and student data are not retained in alignment events or the profile.
