from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resources', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='visualaid',
            name='imageUrl',
            field=models.TextField(),
        ),
    ]
