"""Aggregate queued teacher alignment events into safe profile snapshots."""
import time

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from iep_management.alignment import refresh_teacher_profile
from users.models import Teacher, TeacherAlignmentEvent


def process_one_teacher():
    """Process one teacher's pending events transactionally; return event count."""
    teacher_id = (
        TeacherAlignmentEvent.objects
        .filter(processed_at__isnull=True)
        .order_by('created_at', 'pk')
        .values_list('teacher_id', flat=True)
        .first()
    )
    if teacher_id is None:
        return 0

    with transaction.atomic():
        teacher = Teacher.objects.select_for_update().filter(pk=teacher_id).first()
        if teacher is None:
            return 0
        pending_ids = list(
            TeacherAlignmentEvent.objects
            .filter(teacher=teacher, processed_at__isnull=True)
            .select_for_update(skip_locked=True)
            .order_by('created_at', 'pk')
            .values_list('pk', flat=True)
        )
        if not pending_ids:
            return 0
        refresh_teacher_profile(teacher)
        processed_at = timezone.now()
        return TeacherAlignmentEvent.objects.filter(
            pk__in=pending_ids,
            processed_at__isnull=True,
        ).update(processed_at=processed_at)


class Command(BaseCommand):
    help = 'Aggregate queued privacy-safe teacher alignment events into profile snapshots.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--loop', action='store_true',
            help='Keep polling for new events (run as a long-lived worker).',
        )
        parser.add_argument(
            '--poll-seconds', type=float, default=2.0,
            help='Seconds to wait between empty polls when --loop is enabled.',
        )

    def handle(self, *args, **options):
        total_processed = 0
        while True:
            processed = process_one_teacher()
            if processed:
                total_processed += processed
                continue
            if not options['loop']:
                break
            time.sleep(max(0.1, options['poll_seconds']))
        self.stdout.write(self.style.SUCCESS(f'Processed {total_processed} alignment event(s).'))
