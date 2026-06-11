from django.db import models
from students.models import Student
from fees.models import FeeStructure


class Invoice(models.Model):
    student       = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='invoices')
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name='invoices')
    invoice_no    = models.CharField(max_length=30, unique=True, editable=False)
    issued_at     = models.DateTimeField(auto_now_add=True)
    due_date      = models.DateField(null=True, blank=True)
    note          = models.TextField(blank=True)

    class Meta:
        unique_together = [('student', 'fee_structure')]
        ordering = ['-issued_at']

    def save(self, *args, **kwargs):
        if not self.invoice_no:
            last = Invoice.objects.aggregate(n=models.Max('id'))['n'] or 0
            self.invoice_no = f'INV-{str(last + 1).zfill(5)}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.invoice_no} — {self.student} — {self.fee_structure}'
