from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('staff', '0001_add_staff'),
    ]

    operations = [
        migrations.AddField(
            model_name='staff',
            name='assigned_classes',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
