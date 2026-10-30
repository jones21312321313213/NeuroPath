from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('users', '0007_alter_studentprofile_asdbackground_and_more')]

    operations = [
        migrations.AddField(
            model_name='teacher', name='alignment_profile',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='teacher', name='alignment_profile_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
