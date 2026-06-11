from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0006_add_term_year_to_mark'),
        ('api', '0004_business_uid'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='student',
            constraint=models.UniqueConstraint(
                fields=['business', 'student_id'],
                condition=models.Q(student_id__gt=''),
                name='unique_student_id_per_business',
            ),
        ),
    ]
