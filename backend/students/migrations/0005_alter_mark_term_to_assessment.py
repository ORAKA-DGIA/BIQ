# Generated migration with correct operation order

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0004_mark'),
    ]

    operations = [
        # First, remove the old unique_together constraint
        migrations.AlterUniqueTogether(
            name='mark',
            unique_together=set(),
        ),
        # Then remove the term field
        migrations.RemoveField(
            model_name='mark',
            name='term',
        ),
        # Add the assessment field
        migrations.AddField(
            model_name='mark',
            name='assessment',
            field=models.CharField(default='BOT', max_length=50),
        ),
        # Update the model options
        migrations.AlterModelOptions(
            name='mark',
            options={'ordering': ['subject', 'assessment']},
        ),
        # Add the new unique_together constraint
        migrations.AlterUniqueTogether(
            name='mark',
            unique_together={('student', 'subject', 'assessment')},
        ),
    ]
