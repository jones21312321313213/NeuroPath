from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iep_management', '0003_alter_iepmodel_baselinedata_alter_iepmodel_goals'),
    ]

    operations = [
        migrations.AddField(
            model_name='iepmodel',
            name='learning_accommodations',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Accommodations per difficulty row',
            ),
        ),
    ]
