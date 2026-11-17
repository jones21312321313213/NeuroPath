from datetime import timedelta
from django.db import IntegrityError
from django.utils import timezone
from .models import (
    ScheduleEvent,
    ScheduleEventType,
    ScheduleEventPriority,
    ScheduleEventStatus,
    Notification,
    NotificationTriggerType,
)


PRIORITY_RANK = {
    ScheduleEventPriority.LOW: 1,
    ScheduleEventPriority.MEDIUM: 2,
    ScheduleEventPriority.HIGH: 3,
    ScheduleEventPriority.URGENT: 4,
}

PRIORITY_LEAD_DAYS = {
    ScheduleEventPriority.LOW: 1,
    ScheduleEventPriority.MEDIUM: 2,
    ScheduleEventPriority.HIGH: 3,
    ScheduleEventPriority.URGENT: 3,
}


def normalize_priority(value, default=ScheduleEventPriority.MEDIUM):
    """Normalizes priority strings ('low', 'med'/'medium', 'high', 'urgent')."""
    s = str(value or '').strip().lower()
    if s in ('med', 'medium'):
        return ScheduleEventPriority.MEDIUM
    if s in ('low', 'high', 'urgent'):
        return s
    return default


def get_lead_days_for_priority(priority):
    """Returns advance notification lead days: Low=1, Medium=2, High/Urgent=3."""
    norm = normalize_priority(priority, default=ScheduleEventPriority.MEDIUM)
    return PRIORITY_LEAD_DAYS.get(norm, 2)


def _pick_higher_priority(current, candidate):
    """Returns whichever priority has the higher rank."""
    if not current:
        return candidate
    if PRIORITY_RANK.get(candidate, 0) > PRIORITY_RANK.get(current, 0):
        return candidate
    return current


def _resolve_milestone_priorities_and_notes(iep_instance):
    """
    Extracts Month 1, Month 2, and Month 3 target notes and highest assigned
    priority levels from saved IEPGoal rows, falling back to generatedDetails JSON
    when IEPGoal rows have not yet been persisted.
    """
    m1_targets, m2_targets, m3_targets = [], [], []
    m1_prio = None
    m2_prio = None
    m3_prio = None

    has_goal_rows = False
    try:
        goals = list(iep_instance.individual_goals.prefetch_related('objective_rows').all())
        for g in goals:
            category = g.subject_category or g.goalName or "Goal"
            for row in g.objective_rows.all():
                has_goal_rows = True
                if row.month_1_target and row.month_1_target.strip():
                    m1_targets.append(f"[{category}] {row.month_1_target.strip()}")
                if row.month_2_target and row.month_2_target.strip():
                    m2_targets.append(f"[{category}] {row.month_2_target.strip()}")
                if row.month_3_target and row.month_3_target.strip():
                    m3_targets.append(f"[{category}] {row.month_3_target.strip()}")

                m1_prio = _pick_higher_priority(m1_prio, normalize_priority(getattr(row, 'month_1_priority', None), ScheduleEventPriority.MEDIUM))
                m2_prio = _pick_higher_priority(m2_prio, normalize_priority(getattr(row, 'month_2_priority', None), ScheduleEventPriority.MEDIUM))
                m3_prio = _pick_higher_priority(m3_prio, normalize_priority(getattr(row, 'month_3_priority', None), ScheduleEventPriority.HIGH))
    except Exception:
        pass

    if not has_goal_rows:
        details = iep_instance.generatedDetails if isinstance(iep_instance.generatedDetails, dict) else {}
        learner_goals = (
            details.get('learnerGoals')
            or details.get('sectionC')
            or details.get('goals')
            or details.get('generatedGoals')
            or []
        )
        if isinstance(learner_goals, list):
            for g in learner_goals:
                if not isinstance(g, dict):
                    continue
                category = g.get('subject_category') or g.get('type') or g.get('goalName') or "Goal"
                rows = g.get('objective_rows') or g.get('rows') or []
                if not isinstance(rows, list):
                    continue
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    m1_val = (row.get('month_1_target') or row.get('month1') or row.get('month_1') or '').strip()
                    m2_val = (row.get('month_2_target') or row.get('month2') or row.get('month_2') or '').strip()
                    m3_val = (row.get('month_3_target') or row.get('month3') or row.get('month_3') or '').strip()
                    if m1_val:
                        m1_targets.append(f"[{category}] {m1_val}")
                    if m2_val:
                        m2_targets.append(f"[{category}] {m2_val}")
                    if m3_val:
                        m3_targets.append(f"[{category}] {m3_val}")

                    p1 = row.get('month_1_priority') or row.get('month1Priority')
                    p2 = row.get('month_2_priority') or row.get('month2Priority')
                    p3 = row.get('month_3_priority') or row.get('month3Priority')
                    if p1:
                        m1_prio = _pick_higher_priority(m1_prio, normalize_priority(p1, ScheduleEventPriority.MEDIUM))
                    if p2:
                        m2_prio = _pick_higher_priority(m2_prio, normalize_priority(p2, ScheduleEventPriority.MEDIUM))
                    if p3:
                        m3_prio = _pick_higher_priority(m3_prio, normalize_priority(p3, ScheduleEventPriority.HIGH))

    m1_notes = "\n".join(m1_targets) if m1_targets else "Initial 30-day milestone progress review."
    m2_notes = "\n".join(m2_targets) if m2_targets else "Mid-quarter 60-day milestone progress review."
    m3_notes = "\n".join(m3_targets) if m3_targets else "Quarterly review and regression check (DepEd Order No. 44, s. 2021)."

    return {
        'm1_notes': m1_notes,
        'm2_notes': m2_notes,
        'm3_notes': m3_notes,
        'm1_priority': m1_prio or ScheduleEventPriority.MEDIUM,
        'm2_priority': m2_prio or ScheduleEventPriority.MEDIUM,
        'm3_priority': m3_prio or ScheduleEventPriority.HIGH,
    }


def create_iep_milestone_events(iep_instance, teacher):
    """
    Automatically populates DepEd Order No. 44, s. 2021 time-bound IEP milestones
    upon IEP acceptance and saving, inheriting monthly priorities from Section C rows.
    """
    if not iep_instance or not teacher:
        return []

    student = iep_instance.studentID

    # 1. Supersede any existing pending milestone events for this student
    milestone_types = [
        ScheduleEventType.MONTH_1_MILESTONE,
        ScheduleEventType.MONTH_2_MILESTONE,
        ScheduleEventType.QUARTERLY_REVIEW,
        ScheduleEventType.ANNUAL_RENEWAL,
    ]
    ScheduleEvent.objects.filter(
        student=student,
        teacher=teacher,
        status=ScheduleEventStatus.PENDING,
        event_type__in=milestone_types,
    ).update(status=ScheduleEventStatus.DISMISSED)

    # 2. Compute base date from IEP creation
    if hasattr(iep_instance, 'createdDate') and iep_instance.createdDate:
        base_date = iep_instance.createdDate.date()
    else:
        base_date = timezone.now().date()

    # 3. Extract objective targets & monthly priorities from Section C goals
    resolved = _resolve_milestone_priorities_and_notes(iep_instance)
    annual_notes = "Annual IEP evaluation, multidisciplinary team review, and synthesis of next IEP cycle."

    student_name = student.name or "Student"
    version_str = f" (IEP v{iep_instance.version})" if getattr(iep_instance, 'version', None) else ""

    events_to_create = [
        ScheduleEvent(
            teacher=teacher,
            student=student,
            iep=iep_instance,
            title=f"Month 1 Milestone Assessment — {student_name}{version_str}",
            event_type=ScheduleEventType.MONTH_1_MILESTONE,
            due_date=base_date + timedelta(days=30),
            priority=resolved['m1_priority'],
            status=ScheduleEventStatus.PENDING,
            notes=resolved['m1_notes'],
        ),
        ScheduleEvent(
            teacher=teacher,
            student=student,
            iep=iep_instance,
            title=f"Month 2 Milestone Assessment — {student_name}{version_str}",
            event_type=ScheduleEventType.MONTH_2_MILESTONE,
            due_date=base_date + timedelta(days=60),
            priority=resolved['m2_priority'],
            status=ScheduleEventStatus.PENDING,
            notes=resolved['m2_notes'],
        ),
        ScheduleEvent(
            teacher=teacher,
            student=student,
            iep=iep_instance,
            title=f"Quarterly Review & Regression Check — {student_name}{version_str}",
            event_type=ScheduleEventType.QUARTERLY_REVIEW,
            due_date=base_date + timedelta(days=90),
            priority=resolved['m3_priority'],
            status=ScheduleEventStatus.PENDING,
            notes=resolved['m3_notes'],
        ),
        ScheduleEvent(
            teacher=teacher,
            student=student,
            iep=iep_instance,
            title=f"Annual IEP Renewal — {student_name}{version_str}",
            event_type=ScheduleEventType.ANNUAL_RENEWAL,
            due_date=base_date + timedelta(days=365),
            priority=ScheduleEventPriority.URGENT,
            status=ScheduleEventStatus.PENDING,
            notes=annual_notes,
        ),
    ]

    created_events = ScheduleEvent.objects.bulk_create(events_to_create)
    return created_events


def sync_iep_milestone_event_priorities(iep_instance, teacher):
    """
    Synchronizes pending milestone ScheduleEvent priorities and notes when
    IEPGoal / IEPObjectiveRow records are added or updated.
    """
    if not iep_instance or not teacher:
        return

    resolved = _resolve_milestone_priorities_and_notes(iep_instance)
    mapping = {
        ScheduleEventType.MONTH_1_MILESTONE: (resolved['m1_priority'], resolved['m1_notes']),
        ScheduleEventType.MONTH_2_MILESTONE: (resolved['m2_priority'], resolved['m2_notes']),
        ScheduleEventType.QUARTERLY_REVIEW: (resolved['m3_priority'], resolved['m3_notes']),
    }

    existing_events = list(
        ScheduleEvent.objects.filter(
            iep=iep_instance,
            teacher=teacher,
            status=ScheduleEventStatus.PENDING,
            event_type__in=list(mapping.keys()),
        )
    )
    if not existing_events:
        return

    for ev in existing_events:
        new_priority, new_notes = mapping[ev.event_type]
        if ev.priority != new_priority or ev.notes != new_notes:
            ev.priority = new_priority
            ev.notes = new_notes
            ev.save(update_fields=['priority', 'notes', 'updated_at'])


def is_event_within_notification_window(event, today=None):
    """
    Returns True if a pending ScheduleEvent falls within its priority-based
    notification window:
      - Low priority:    1 day before (days_remaining <= 1)
      - Medium priority: 2 days before (days_remaining <= 2)
      - High / Urgent:   3 days before (days_remaining <= 3)
    Overdue (days_remaining < 0) and Due Today (days_remaining == 0) always qualify.
    """
    if not event or not event.due_date:
        return False
    ref_date = today or timezone.now().date()
    days_remaining = (event.due_date - ref_date).days
    lead_days = get_lead_days_for_priority(event.priority)
    return days_remaining <= lead_days


def sync_teacher_notifications(teacher, today=None):
    """
    Checks pending ScheduleEvents for the teacher against priority lead-time rules
    and persists historical Notification records without creating duplicates.
    """
    if not teacher:
        return []

    ref_date = today or timezone.now().date()
    pending_events = (
        ScheduleEvent.objects.filter(
            teacher=teacher,
            status=ScheduleEventStatus.PENDING,
            due_date__lte=ref_date + timedelta(days=3),
        )
        .select_related('student', 'iep')
    )

    created_notifications = []
    for event in pending_events:
        days_remaining = (event.due_date - ref_date).days
        lead_days = get_lead_days_for_priority(event.priority)

        if days_remaining > lead_days:
            continue

        if days_remaining < 0:
            trigger_type = NotificationTriggerType.OVERDUE
            days_past = abs(days_remaining)
            message = (
                f"Overdue by {days_past} day{'s' if days_past != 1 else ''} "
                f"(Scheduled for {event.due_date.isoformat()}). Priority: {event.priority.title()}."
            )
        elif days_remaining == 0:
            trigger_type = NotificationTriggerType.DUE_TODAY
            message = (
                f"Scheduled for today ({event.due_date.isoformat()}). "
                f"Priority: {event.priority.title()}."
            )
        else:
            trigger_type = NotificationTriggerType.ADVANCE_NOTICE
            message = (
                f"Upcoming in {days_remaining} day{'s' if days_remaining != 1 else ''} "
                f"({event.due_date.isoformat()}) — {event.priority.title()} priority "
                f"({lead_days}-day advance alert)."
            )

        try:
            notif, created = Notification.objects.get_or_create(
                teacher=teacher,
                schedule_event=event,
                trigger_type=trigger_type,
                defaults={
                    'student': event.student,
                    'iep': event.iep,
                    'title': event.title,
                    'message': message,
                    'priority': event.priority,
                    'lead_days': lead_days,
                    'due_date': event.due_date,
                },
            )
            if not created and notif.priority != event.priority:
                notif.priority = event.priority
                notif.lead_days = lead_days
                notif.message = message
                notif.save(update_fields=['priority', 'lead_days', 'message'])
            if created:
                created_notifications.append(notif)
        except IntegrityError:
            # Concurrent request already created this notification
            continue

    return created_notifications
