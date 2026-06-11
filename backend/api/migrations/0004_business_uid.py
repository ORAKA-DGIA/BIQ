import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_add_school_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='business',
            name='uid',
            field=models.UUIDField(default=uuid.uuid4, editable=False),
        ),
        # Populate uid for existing rows before enforcing uniqueness
        migrations.RunSQL(
            sql="UPDATE api_business SET uid = lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))) WHERE uid IS NULL OR uid = '00000000-0000-0000-0000-000000000000';",
            reverse_sql="",
        ),
        migrations.AlterField(
            model_name='business',
            name='uid',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
