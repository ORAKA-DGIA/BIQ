from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q
from fees.models import FeeStructure, FeePayment
from students.models import Student
from .models import Invoice
from .serializers import InvoiceSerializer
from api.views import get_owner_user


def _photo_url(student, request):
    if not student.photo:
        return None
    try:
        url = student.photo.url
        return request.build_absolute_uri(url) if not url.startswith('http') else url
    except Exception:
        return None


class DebtorListView(APIView):
    """
    GET /api/invoices/debtors/?term=1&year=2026&class_name=S.4
    Returns all students with outstanding balance > 0 across matching structures.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner      = get_owner_user(request)
        term       = request.query_params.get('term')
        year       = request.query_params.get('year')
        class_name = request.query_params.get('class_name')

        structures = FeeStructure.objects.filter(business__owner=owner)
        if term:       structures = structures.filter(term=term)
        if year:       structures = structures.filter(year=year)
        if class_name: structures = structures.filter(
            Q(class_name=class_name) | Q(class_name='')
        )

        debtors = []
        for fs in structures:
            students = Student.objects.filter(business__owner=owner, status='active')
            if fs.class_name:
                students = students.filter(class_name=fs.class_name)

            for student in students:
                paid = float(
                    FeePayment.objects.filter(student=student, fee_structure=fs)
                    .aggregate(s=Sum('amount_paid'))['s'] or 0
                )
                balance = float(fs.amount) - paid
                if balance > 0:
                    invoice = Invoice.objects.filter(student=student, fee_structure=fs).first()
                    debtors.append({
                        'student_id':   student.id,
                        'student_name': f"{student.first_name} {student.last_name}".strip(),
                        'student_no':   student.student_id or None,
                        'student_class':student.class_name,
                        'photo_url':    _photo_url(student, request),
                        'parent_name':  student.parent_name or None,
                        'parent_phone': student.parent_phone or None,
                        'fee_structure_id': fs.id,
                        'fee_name':     fs.name,
                        'fee_term':     fs.term,
                        'fee_year':     fs.year,
                        'fee_class':    fs.class_name or 'All Classes',
                        'fee_amount':   float(fs.amount),
                        'currency':     fs.currency,
                        'total_paid':   paid,
                        'balance':      balance,
                        'invoice_id':   invoice.id if invoice else None,
                        'invoice_no':   invoice.invoice_no if invoice else None,
                    })

        debtors.sort(key=lambda d: d['student_name'])
        return Response(debtors)


class BulkInvoiceListView(APIView):
    """
    GET /api/invoices/bulk/?term=1&year=2025&class_name=S.4&min_balance=0&max_balance=
    Returns students with outstanding balance matching filters, grouped ready for bulk print.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner      = get_owner_user(request)
        term       = request.query_params.get('term')
        year       = request.query_params.get('year')
        class_name = request.query_params.get('class_name', '')
        min_bal    = request.query_params.get('min_balance')
        max_bal    = request.query_params.get('max_balance')

        structures = FeeStructure.objects.filter(business__owner=owner)
        if term:       structures = structures.filter(term=term)
        if year:       structures = structures.filter(year=year)
        if class_name: structures = structures.filter(Q(class_name=class_name) | Q(class_name=''))

        results = []
        for fs in structures:
            students = Student.objects.filter(business__owner=owner, status='active')
            if fs.class_name:
                students = students.filter(class_name=fs.class_name)
            for student in students:
                paid    = float(FeePayment.objects.filter(student=student, fee_structure=fs).aggregate(s=Sum('amount_paid'))['s'] or 0)
                balance = float(fs.amount) - paid
                if balance <= 0:
                    continue
                if min_bal and balance < float(min_bal):
                    continue
                if max_bal and balance > float(max_bal):
                    continue
                invoice, _ = Invoice.objects.get_or_create(student=student, fee_structure=fs)
                results.append({
                    'student_id':    student.id,
                    'student_name':  f"{student.first_name} {student.last_name}".strip(),
                    'student_no':    student.student_id or None,
                    'student_class': student.class_name,
                    'photo_url':     _photo_url(student, request),
                    'fee_structure_id': fs.id,
                    'fee_name':      fs.name,
                    'fee_amount':    float(fs.amount),
                    'currency':      fs.currency,
                    'total_paid':    paid,
                    'balance':       balance,
                    'invoice_no':    invoice.invoice_no,
                })

        results.sort(key=lambda r: (r['student_class'], r['student_name']))
        return Response(results)


class InvoiceDetailView(APIView):
    """
    GET /api/invoices/<student_id>/<structure_id>/
    Returns (and auto-creates) a single invoice for a student+structure.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id, structure_id):
        owner = get_owner_user(request)
        try:
            student = Student.objects.get(pk=student_id, business__owner=owner)
            fs      = FeeStructure.objects.get(pk=structure_id, business__owner=owner)
        except (Student.DoesNotExist, FeeStructure.DoesNotExist):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        paid = float(
            FeePayment.objects.filter(student=student, fee_structure=fs)
            .aggregate(s=Sum('amount_paid'))['s'] or 0
        )
        balance = float(fs.amount) - paid
        if balance <= 0:
            return Response({'detail': 'No outstanding balance.'}, status=status.HTTP_400_BAD_REQUEST)

        invoice, _ = Invoice.objects.get_or_create(student=student, fee_structure=fs)
        serializer = InvoiceSerializer(invoice, context={'request': request})
        return Response(serializer.data)
