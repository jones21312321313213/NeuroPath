from datetime import timedelta
from django.utils import timezone
from .models import ScheduleEvent, ScheduleEventType, ScheduleEventPriority, ScheduleEventStatus


def create_iep_milestone_events(iep_instance, teacher):
    """
    Automatically populates DepEd Order No. 44, s. 2021 time-bound IEP milestones
    upon IEP acceptance and saving.
    
    1. Dismisses previous pending milestone events for the same student (to prevent
       stale/duplicate milestone reminders when a newer IEP version is created).
    2. Gathers Month 1, Month 2, and Month 3 target objectives from IEPGoal objective rows.
    3. Synthesizes 4 scheduled events:
       - Month 1 Milestone Assessment (+30 days)
       - Month 2 Milestone Assessment (+60 days)
       - Month 3 Quarterly Review & Regression Check (+90 days)
       - Annual IEP Renewal (+365 days)
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

    # 3. Extract objective targets from Section C goals
    m1_targets = []
    m2_targets = []
    m3_targets = []

    try:
        goals = list(iep_instance.individual_goals.prefetch_related('objective_rows').all())
        for g in goals:
            category = g.subject_category or g.goalName or "Goal"
            for row in g.objective_rows.all():
                if row.month_1_target and row.month_1_target.strip():
                    m1_targets.append(f"[{category}] {row.month_1_target.strip()}")
                if row.month_2_target and row.month_2_target.strip():
                    m2_targets.append(f"[{category}] {row.month_2_target.strip()}")
                if row.month_3_target and row.month_3_target.strip():
                    m3_targets.append(f"[{category}] {row.month_3_target.strip()}")
    except Exception:
        pass

    m1_notes = "\n".join(m1_targets) if m1_targets else "Initial 30-day milestone progress review."
    m2_notes = "\n".join(m2_targets) if m2_targets else "Mid-quarter 60-day milestone progress review."
    m3_notes = "\n".join(m3_targets) if m3_targets else "Quarterly review and regression check (DepEd Order No. 44, s. 2021)."
    annual_notes = "Annual IEP evaluation, multidisciplinary conference, and synthesis of next IEP cycle."

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
            priority=ScheduleEventPriority.MEDIUM,
            status=ScheduleEventStatus.PENDING,
            notes=m1_notes,
        ),
        ScheduleEvent(
            teacher=teacher,
            student=student,
            iep=iep_instance,
            title=f"Month 2 Milestone Assessment — {student_name}{version_str}",
            event_type=ScheduleEventType.MONTH_2_MILESTONE,
            due_date=base_date + timedelta(days=60),
            priority=ScheduleEventPriority.MEDIUM,
            status=ScheduleEventStatus.PENDING,
            notes=m2_notes,
        ),
        ScheduleEvent(
            teacher=teacher,
            student=student,
            iep=iep_instance,
            title=f"Quarterly Review & Regression Check — {student_name}{version_str}",
            event_type=ScheduleEventType.QUARTERLY_REVIEW,
            due_date=base_date + timedelta(days=90),
            priority=ScheduleEventPriority.HIGH,
            status=ScheduleEventStatus.PENDING,
            notes=m3_notes,
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
