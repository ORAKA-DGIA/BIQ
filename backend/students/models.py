from django.db import models
from api.models import Business


def _generate_student_id(business):
    """Generate a student ID scoped to the business: <BIZ_SHORT>-<SEQ>"""
    prefix = str(business.uid).replace('-', '')[:6].upper()
    last = (
        Student.objects.filter(business=business)
        .exclude(student_id='')
        .order_by('-id')
        .first()
    )
    seq = 1
    if last and last.student_id:
        try:
            seq = int(last.student_id.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = Student.objects.filter(business=business).count() + 1
    return f"{prefix}-{seq:04d}"


class Student(models.Model):
    GENDER_CHOICES = [('male', 'Male'), ('female', 'Female'), ('other', 'Other')]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('graduated', 'Graduated'),
        ('transferred', 'Transferred'),
    ]

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='students')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    student_id = models.CharField(max_length=50, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    class_name = models.CharField(max_length=50)
    section = models.CharField(max_length=20, blank=True)
    admission_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    parent_name = models.CharField(max_length=150, blank=True)
    parent_phone = models.CharField(max_length=20, blank=True)
    parent_email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    photo = models.ImageField(upload_to='students/photos/', null=True, blank=True)
    photo_upload_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('done', 'Done'), ('failed', 'Failed')],
        default='done', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['class_name', 'last_name', 'first_name']
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'student_id'],
                condition=models.Q(student_id__gt=''),
                name='unique_student_id_per_business',
            )
        ]

    def save(self, *args, **kwargs):
        if not self.student_id:
            self.student_id = _generate_student_id(self.business)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Mark(models.Model):
    TERM_CHOICES = [('1', 'Term 1'), ('2', 'Term 2'), ('3', 'Term 3')]

    student    = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='marks')
    term       = models.CharField(max_length=10, choices=TERM_CHOICES, default='1')
    year       = models.PositiveIntegerField(default=2025)
    subject    = models.CharField(max_length=100)
    assessment = models.CharField(max_length=50, default='BOT')
    score      = models.DecimalField(max_digits=6, decimal_places=2)
    max_score  = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    grade      = models.CharField(max_length=5, blank=True)
    comment    = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['year', 'term', 'subject', 'assessment']
        unique_together = [('student', 'subject', 'assessment', 'term', 'year')]

    def __str__(self):
        return f"{self.student} — {self.subject} ({self.assessment}) T{self.term} {self.year}: {self.score}"
