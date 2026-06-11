from django.contrib import admin
from .models import FeeStructure, FeePayment

@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ['name', 'class_name', 'term', 'year', 'amount', 'currency']
    list_filter  = ['term', 'year', 'class_name']

@admin.register(FeePayment)
class FeePaymentAdmin(admin.ModelAdmin):
    list_display = ['student', 'fee_structure', 'amount_paid', 'payment_date', 'method']
    list_filter  = ['method', 'payment_date']
    search_fields = ['student__first_name', 'student__last_name', 'reference']
