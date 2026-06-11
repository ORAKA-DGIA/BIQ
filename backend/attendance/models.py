from django.db import models
from students.models import Student


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent',  'Absent'),
        ('late',    'Late'),
        ('excused', 'Excused'),
    ]
    TERM_CHOICES = [('1', 'Term 1'), ('2', 'Term 2'), ('3', 'Term 3')]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date    = models.DateField()
    term    = models.CharField(max_length=10, choices=TERM_CHOICES, default='1')
    year    = models.PositiveIntegerField(default=2025)
    status  = models.CharField(max_length=10, choices=STATUS_CHOICES, default='present')
    note    = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'student__class_name', 'student__last_name']
        unique_together = [('student', 'date')]

    def __str__(self):
        return f"{self.student} — {self.date} ({self.status})"
