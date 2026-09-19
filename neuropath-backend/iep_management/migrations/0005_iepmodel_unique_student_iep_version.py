from django.db import migrations, models
from django.db.models import Count


def deduplicate_iep_versions(apps, schema_editor):
    """Re-number duplicate (studentID, version) rows so the unique
    constraint can be safely applied.

    For each (studentID, version) pair that appears more than once, the
    first row (by createdDate then iepID) is kept untouched and every
    subsequent duplicate is assigned a new, unique version number.
    """
    IEPModel = apps.get_model('iep_management', 'IEPModel')

    dupes = (
        IEPModel.objects
        .values('studentID', 'version')
        .annotate(cnt=Count('iepID'))
        .filter(cnt__gt=1)
    )
    for dupe in dupes:
        rows = list(
            IEPModel.objects
            .filter(studentID=dupe['studentID'], version=dupe['version'])
            .order_by('createdDate', 'iepID')
        )
        # Determine the current maximum version for this student so new
        # version numbers are guaranteed to be unique.
        max_ver = (
            IEPModel.objects
            .filter(studentID=dupe['studentID'])
            .order_by('-version')
            .values_list('version', flat=True)
            .first()
        ) or 0
        # Keep the first row; renumber the rest sequentially.
        for i, row in enumerate(rows[1:], start=1):
            row.version = max_ver + i
            row.save(update_fields=['version'])


class Migration(migrations.Migration):

    dependencies = [
        ('iep_management', '0004_iepmodel_learning_accommodations'),
    ]

    operations = [
        migrations.RunPython(
            deduplicate_iep_versions,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AddConstraint(
            model_name='iepmodel',
            constraint=models.UniqueConstraint(
                fields=('studentID', 'version'),
                name='unique_student_iep_version',
            ),
        ),
    ]
