from rest_framework import serializers
from .models import FeeStructure, FeePayment


class FeeStructureSerializer(serializers.ModelSerializer):
    total_expected = serializers.SerializerMethodField(read_only=True)
    total_paid     = serializers.SerializerMethodField(read_only=True)
    outstanding    = serializers.SerializerMethodField(read_only=True)
    payment_count  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = FeeStructure
        fields = [
            'id', 'business', 'name', 'class_name', 'term', 'year',
            'amount', 'currency', 'description',
            'total_expected', 'total_paid', 'outstanding', 'payment_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'business', 'created_at', 'updated_at']

    def get_total_paid(self, obj):
        total = sum(p.amount_paid for p in obj.payments.all())
        return float(total)

    def get_payment_count(self, obj):
        return obj.payments.count()

    def get_total_expected(self, obj):
        from students.models import Student
        qs = Student.objects.filter(business=obj.business, status='active')
        if obj.class_name:
            qs = qs.filter(class_name=obj.class_name)
        return float(obj.amount) * qs.count()

    def get_outstanding(self, obj):
        return max(0, self.get_total_expected(obj) - self.get_total_paid(obj))


class FeePaymentSerializer(serializers.ModelSerializer):
    student_name  = serializers.SerializerMethodField(read_only=True)
    student_class = serializers.SerializerMethodField(read_only=True)
    photo_url     = serializers.SerializerMethodField(read_only=True)
    fee_name      = serializers.SerializerMethodField(read_only=True)
    balance       = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = FeePayment
        fields = [
            'id', 'student', 'student_name', 'student_class', 'photo_url',
            'fee_structure', 'fee_name',
            'amount_paid', 'balance', 'payment_date', 'method', 'reference', 'note',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_student_name(self, obj):  return f"{obj.student.first_name} {obj.student.last_name}".strip()
    def get_student_class(self, obj): return obj.student.class_name
    def get_fee_name(self, obj):      return str(obj.fee_structure)

    def get_photo_url(self, obj):
        if not obj.student.photo:
            return None
        request = self.context.get('request')
        try:
            url = obj.student.photo.url
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None

    def get_balance(self, obj):
        # Total paid by this student for this fee structure
        from django.db.models import Sum
        total = FeePayment.objects.filter(
            student=obj.student, fee_structure=obj.fee_structure
        ).aggregate(s=Sum('amount_paid'))['s'] or 0
        return float(obj.fee_structure.amount) - float(total)
