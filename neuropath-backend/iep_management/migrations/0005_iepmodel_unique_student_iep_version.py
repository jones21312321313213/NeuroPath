from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iep_management', '0004_iepmodel_learning_accommodations'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='iepmodel',
            constraint=models.UniqueConstraint(fields=('studentID', 'version'), name='unique_student_iep_version'),
        ),
    ]
