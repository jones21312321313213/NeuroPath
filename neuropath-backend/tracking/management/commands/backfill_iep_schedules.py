from django.core.management.base import BaseCommand
from iep_management.models import IEPModel
from tracking.scheduling_service import create_iep_milestone_events
from tracking.models import ScheduleEvent


class Command(BaseCommand):
    help = "Populate ScheduleEvent milestones for existing active IEPs."

    def handle(self, *args, **options):
        active_ieps = (
            IEPModel.objects.filter(is_archived=False)
            .select_related('studentID', 'studentID__teacher')
            .order_by('createdDate')
        )
        total_created = 0

        for iep in active_ieps:
            teacher = getattr(iep.studentID, 'teacher', None)
            if not teacher:
                continue

            # If this IEP already has schedule events, skip
            if ScheduleEvent.objects.filter(iep=iep).exists():
                continue

            events = create_iep_milestone_events(iep_instance=iep, teacher=teacher)
            total_created += len(events)
            self.stdout.write(
                f"Generated {len(events)} events for student '{iep.studentID.name}' (IEP v{iep.version})"
            )

        self.stdout.write(
            self.style.SUCCESS(f"Successfully generated {total_created} schedule milestone events.")
        )
