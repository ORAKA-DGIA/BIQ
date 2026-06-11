from rest_framework import serializers
from django.db.models import Sum
from fees.models import FeePayment
from .models import Invoice


class InvoiceSerializer(serializers.ModelSerializer):
    invoice_no    = serializers.CharField(read_only=True)
    issued_at     = serializers.SerializerMethodField()

    student_name  = serializers.SerializerMethodField()
    student_no    = serializers.SerializerMethodField()
    student_class = serializers.SerializerMethodField()
    student_gender= serializers.SerializerMethodField()
    parent_name   = serializers.SerializerMethodField()
    parent_phone  = serializers.SerializerMethodField()
    photo_url     = serializers.SerializerMethodField()

    fee_name      = serializers.SerializerMethodField()
    fee_term      = serializers.SerializerMethodField()
    fee_year      = serializers.SerializerMethodField()
    fee_class     = serializers.SerializerMethodField()
    fee_amount    = serializers.SerializerMethodField()
    currency      = serializers.SerializerMethodField()
    total_paid    = serializers.SerializerMethodField()
    balance       = serializers.SerializerMethodField()

    school_name   = serializers.SerializerMethodField()
    school_motto  = serializers.SerializerMethodField()
    school_address= serializers.SerializerMethodField()
    school_phone  = serializers.SerializerMethodField()
    school_email  = serializers.SerializerMethodField()
    school_logo   = serializers.SerializerMethodField()

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_no', 'issued_at', 'due_date', 'note',
            'student_name', 'student_no', 'student_class', 'student_gender',
            'parent_name', 'parent_phone', 'photo_url',
            'fee_name', 'fee_term', 'fee_year', 'fee_class', 'fee_amount', 'currency',
            'total_paid', 'balance',
            'school_name', 'school_motto', 'school_address', 'school_phone',
            'school_email', 'school_logo',
        ]

    def get_issued_at(self, obj):
        return obj.issued_at.strftime('%d %b %Y').lstrip('0')

    # Student
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}".strip()

    def get_student_no(self, obj):   return obj.student.student_id or None
    def get_student_class(self, obj):return obj.student.class_name
    def get_student_gender(self, obj):
        g = obj.student.gender
        return g.capitalize() if g else None

    def get_parent_name(self, obj):  return obj.student.parent_name or None
    def get_parent_phone(self, obj): return obj.student.parent_phone or None

    def get_photo_url(self, obj):
        if not obj.student.photo:
            return None
        request = self.context.get('request')
        try:
            url = obj.student.photo.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None

    # Fee structure
    def get_fee_name(self, obj):   return obj.fee_structure.name
    def get_fee_term(self, obj):   return obj.fee_structure.term
    def get_fee_year(self, obj):   return obj.fee_structure.year
    def get_fee_class(self, obj):  return obj.fee_structure.class_name or 'All Classes'
    def get_fee_amount(self, obj): return float(obj.fee_structure.amount)
    def get_currency(self, obj):   return obj.fee_structure.currency

    def _total_paid(self, obj):
        total = FeePayment.objects.filter(
            student=obj.student, fee_structure=obj.fee_structure
        ).aggregate(s=Sum('amount_paid'))['s'] or 0
        return float(total)

    def get_total_paid(self, obj): return self._total_paid(obj)

    def get_balance(self, obj):
        return max(0, float(obj.fee_structure.amount) - self._total_paid(obj))

    # School
    def get_school_name(self, obj):    return obj.fee_structure.business.name
    def get_school_motto(self, obj):   return obj.fee_structure.business.description or None
    def get_school_address(self, obj): return getattr(obj.fee_structure.business, 'address', '') or None
    def get_school_phone(self, obj):   return getattr(obj.fee_structure.business, 'phone', '') or None
    def get_school_email(self, obj):   return getattr(obj.fee_structure.business, 'email', '') or None

    def get_school_logo(self, obj):
        logo = getattr(obj.fee_structure.business, 'logo', None)
        if not logo:
            return None
        request = self.context.get('request')
        try:
            url = logo.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None
