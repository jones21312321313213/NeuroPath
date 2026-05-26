# Generated for Module 2 MVP update

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iep_management', '0003_alter_iepgoal_iep'),
    ]

    operations = [
        migrations.AlterField(model_name='iepmodel', name='baselineData', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='iepmodel', name='goals', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='iepmodel', name='accommodations', field=models.TextField(blank=True, default='')),
        migrations.AddField(model_name='iepmodel', name='generatedDetails', field=models.JSONField(blank=True, default=dict)),
    ]
