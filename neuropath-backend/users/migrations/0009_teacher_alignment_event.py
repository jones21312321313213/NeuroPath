from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [('users', '0008_teacher_alignment_profile')]

    operations = [
        migrations.CreateModel(
            name='TeacherAlignmentEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('signals', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('teacher', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='alignment_events',
                    to='users.teacher',
                )),
            ],
            options={'ordering': ['created_at']},
        ),
        migrations.AddIndex(
            model_name='teacheralignmentevent',
            index=models.Index(fields=['processed_at', 'created_at'], name='users_alignproc_created_idx'),
        ),
    ]
