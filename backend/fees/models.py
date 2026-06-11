from django.db import models
from api.models import Business
from students.models import Student


class FeeStructure(models.Model):
    TERM_CHOICES = [('1', 'Term 1'), ('2', 'Term 2'), ('3', 'Term 3')]

    business   = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='fee_structures')
    name       = models.CharField(max_length=150)           # e.g. "Tuition Fee"
    class_name = models.CharField(max_length=50, blank=True) # e.g. "S.4" or blank = all classes
    term       = models.CharField(max_length=10, choices=TERM_CHOICES, default='1')
    year       = models.PositiveIntegerField(default=2025)
    amount     = models.DecimalField(max_digits=12, decimal_places=2)
    currency   = models.CharField(max_length=10, default='UGX')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['year', 'term', 'class_name', 'name']

    def __str__(self):
        return f"{self.name} — {self.class_name or 'All'} T{self.term} {self.year}"


class FeePayment(models.Model):
    METHOD_CHOICES = [
        ('cash',          'Cash'),
        ('mobile_money',  'Mobile Money'),
        ('bank',          'Bank Transfer'),
        ('cheque',        'Cheque'),
        ('other',         'Other'),
    ]
    STATUS_CHOICES = [
        ('paid',    'Paid'),
        ('partial', 'Partial'),
        ('pending', 'Pending'),
    ]

    student       = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fee_payments')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name='payments')
    amount_paid   = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date  = models.DateField()
    method        = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    reference     = models.CharField(max_length=100, blank=True)  # receipt / transaction ref
    note          = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"{self.student} — {self.fee_structure.name} — {self.amount_paid}"
