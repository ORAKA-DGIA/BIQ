from django.db import models
from fees.models import FeePayment
import uuid


def generate_receipt_number():
    from django.db.models import Max
    last = Receipt.objects.aggregate(n=Max('number'))['n'] or 0
    return last + 1


class Receipt(models.Model):
    payment      = models.OneToOneField(FeePayment, on_delete=models.CASCADE, related_name='receipt')
    receipt_no   = models.CharField(max_length=30, unique=True, editable=False)
    issued_at    = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.receipt_no:
            # Get max id to generate sequential number
            last = Receipt.objects.aggregate(n=models.Max('id'))['n'] or 0
            self.receipt_no = f'RCP-{str(last + 1).zfill(5)}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.receipt_no} — {self.payment}'
