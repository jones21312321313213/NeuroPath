from django.core.management.base import BaseCommand

from iep_management.alignment import refresh_teacher_profile
from users.models import Teacher


class Command(BaseCommand):
    help = "Rebuild validated response-style profiles from each teacher's generation history."

    def handle(self, *args, **options):
        updated = 0
        for teacher in Teacher.objects.iterator():
            refresh_teacher_profile(teacher)
            updated += 1
        self.stdout.write(self.style.SUCCESS(f'Refreshed {updated} teacher alignment profiles.'))
