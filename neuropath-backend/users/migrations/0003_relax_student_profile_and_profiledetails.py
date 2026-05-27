# Generated for Module 2 MVP update

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_studentprofile_diagnosis_studentprofile_interests_and_more'),
    ]

    operations = [
        migrations.AlterField(model_name='studentprofile', name='name', field=models.CharField(blank=True, default='', max_length=255)),
        migrations.AlterField(model_name='studentprofile', name='age', field=models.IntegerField(default=0)),
        migrations.AlterField(model_name='studentprofile', name='grade', field=models.IntegerField(default=0)),
        migrations.AlterField(model_name='studentprofile', name='gender', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AlterField(model_name='studentprofile', name='asdBackground', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='studentprofile', name='preferences', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='studentprofile', name='assessmentResult', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='studentprofile', name='diagnosis', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='studentprofile', name='support_needs', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='studentprofile', name='learning_style', field=models.CharField(blank=True, default='', max_length=100)),
        migrations.AlterField(model_name='studentprofile', name='interests', field=models.TextField(blank=True, default='')),
        migrations.AlterField(model_name='studentprofile', name='sensory_preferences', field=models.TextField(blank=True, default='')),
        migrations.AddField(model_name='studentprofile', name='profileDetails', field=models.JSONField(blank=True, default=dict)),
    ]
