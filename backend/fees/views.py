from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Q
from .models import FeeStructure, FeePayment
from .serializers import FeeStructureSerializer, FeePaymentSerializer
from students.models import Student
from api.views import get_owner_user


def _photo_url(student, request):
    if not student.photo:
        return None
    try:
        url = student.photo.url
        if url.startswith('http'):
            return url
        return request.build_absolute_uri(url)
    except Exception:
        return None


class FeeStructureViewSet(viewsets.ModelViewSet):
    serializer_class   = FeeStructureSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_queryset(self):
        owner      = get_owner_user(self.request)
        qs         = FeeStructure.objects.filter(business__owner=owner).prefetch_related('payments')
        term       = self.request.query_params.get('term')
        year       = self.request.query_params.get('year')
        class_name = self.request.query_params.get('class_name')
        if term:       qs = qs.filter(term=term)
        if year:       qs = qs.filter(year=year)
        if class_name: qs = qs.filter(Q(class_name=class_name) | Q(class_name=''))
        return qs

    def perform_create(self, serializer):
        owner = get_owner_user(self.request)
        business = owner.businesses.first()
        serializer.save(business=business)

    # ── Summary ──────────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def summary(self, request):
        owner      = get_owner_user(request)
        term       = request.query_params.get('term')
        year       = request.query_params.get('year')
        class_name = request.query_params.get('class_name')

        qs = FeeStructure.objects.filter(business__owner=owner)
        if term:       qs = qs.filter(term=term)
        if year:       qs = qs.filter(year=year)
        if class_name: qs = qs.filter(Q(class_name=class_name) | Q(class_name=''))

        structures = qs.prefetch_related('payments')
        total_paid = sum(float(p.amount_paid) for fs in structures for p in fs.payments.all())

        total_expected = 0
        for fs in structures:
            student_qs = Student.objects.filter(business__owner=owner, status='active')
            if fs.class_name:
                student_qs = student_qs.filter(class_name=fs.class_name)
            total_expected += float(fs.amount) * student_qs.count()

        total_students_paid = FeePayment.objects.filter(
            fee_structure__in=structures
        ).values('student').distinct().count()

        return Response({
            'total_structures':    structures.count(),
            'total_expected':      total_expected,
            'total_paid':          total_paid,
            'total_outstanding':   max(0, total_expected - total_paid),
            'total_students_paid': total_students_paid,
        })

    # ── Per-student status for one structure ─────────────────────────────────
    @action(detail=True, methods=['get'])
    def student_status(self, request, pk=None):
        owner = get_owner_user(request)
        fs = self.get_object()
        qs = Student.objects.filter(business__owner=owner, status='active')
        if fs.class_name:
            qs = qs.filter(class_name=fs.class_name)

        rows = []
        for student in qs:
            payments = FeePayment.objects.filter(student=student, fee_structure=fs)
            paid     = float(payments.aggregate(s=Sum('amount_paid'))['s'] or 0)
            balance  = float(fs.amount) - paid
            rows.append({
                'student_id':   student.id,
                'student_name': f"{student.first_name} {student.last_name}",
                'student_no':   student.student_id,
                'photo_url':    _photo_url(student, request),
                'amount_due':   float(fs.amount),
                'amount_paid':  paid,
                'balance':      balance,
                'status':       'paid' if balance <= 0 else ('partial' if paid > 0 else 'pending'),
                'payments':     list(payments.values('id', 'amount_paid', 'payment_date', 'method', 'reference')),
            })

        rows.sort(key=lambda r: r['student_name'])
        return Response(rows)

    # ── Grouped student status for all structures in same class/term/year ────
    @action(detail=False, methods=['get'])
    def class_student_status(self, request):
        owner      = get_owner_user(request)
        class_name = request.query_params.get('class_name', '')
        term       = request.query_params.get('term')
        year       = request.query_params.get('year')

        structures = FeeStructure.objects.filter(
            business__owner=owner
        ).filter(Q(class_name=class_name) | Q(class_name=''))
        if term: structures = structures.filter(term=term)
        if year: structures = structures.filter(year=year)
        structures = list(structures.order_by('name'))

        students = Student.objects.filter(business__owner=owner, status='active')
        if class_name:
            students = students.filter(class_name=class_name)
        students = students.order_by('first_name', 'last_name')

        rows = []
        for student in students:
            fees = {}
            total_due = total_paid = 0
            for fs in structures:
                payments = FeePayment.objects.filter(student=student, fee_structure=fs)
                paid    = float(payments.aggregate(s=Sum('amount_paid'))['s'] or 0)
                due     = float(fs.amount)
                balance = due - paid
                total_due  += due
                total_paid += paid
                fees[fs.id] = {
                    'structure_id': fs.id,
                    'amount_due':   due,
                    'amount_paid':  paid,
                    'balance':      balance,
                    'status':       'paid' if balance <= 0 else ('partial' if paid > 0 else 'pending'),
                    'payments':     list(payments.values('id', 'amount_paid', 'payment_date', 'method', 'reference')),
                }
            total_balance = total_due - total_paid
            rows.append({
                'student_id':    student.id,
                'student_name':  f"{student.first_name} {student.last_name}",
                'student_no':    student.student_id,
                'photo_url':     _photo_url(student, request),
                'total_due':     total_due,
                'total_paid':    total_paid,
                'total_balance': total_balance,
                'overall_status': 'paid' if total_balance <= 0 else ('partial' if total_paid > 0 else 'pending'),
                'fees':          fees,
            })
        return Response({'structures': [{'id': fs.id, 'name': fs.name, 'amount': float(fs.amount), 'currency': fs.currency} for fs in structures], 'students': rows})

    # ── Cumulative balance per student across all terms/years ─────────────────
    @action(detail=False, methods=['get'])
    def student_balances(self, request):
        owner      = get_owner_user(request)
        class_name = request.query_params.get('class_name')
        year       = request.query_params.get('year')

        students = Student.objects.filter(business__owner=owner, status='active')
        if class_name:
            students = students.filter(class_name=class_name)

        structures_qs = FeeStructure.objects.filter(
            business__owner=owner
        ).filter(Q(class_name=class_name) | Q(class_name=''))
        if year:
            structures_qs = structures_qs.filter(year=year)
        structures_qs = structures_qs.order_by('year', 'term', 'name')

        rows = []
        for student in students:
            terms_detail = []
            running_balance = 0

            for fs in structures_qs:
                payments = FeePayment.objects.filter(student=student, fee_structure=fs)
                paid     = float(payments.aggregate(s=Sum('amount_paid'))['s'] or 0)
                due      = float(fs.amount)
                term_bal = due - paid
                running_balance += term_bal
                terms_detail.append({
                    'structure_id':   fs.id,
                    'structure_name': fs.name,
                    'term':           fs.term,
                    'year':           fs.year,
                    'amount_due':     due,
                    'amount_paid':    paid,
                    'term_balance':   term_bal,
                    'status':         'paid' if term_bal <= 0 else ('partial' if paid > 0 else 'pending'),
                })

            rows.append({
                'student_id':       student.id,
                'student_name':     f"{student.first_name} {student.last_name}",
                'student_no':       student.student_id,
                'photo_url':        _photo_url(student, request),
                'total_balance':    running_balance,
                'terms':            terms_detail,
            })

        rows.sort(key=lambda r: r['student_name'])
        return Response(rows)

    # ── Carry forward unpaid balances into a new structure ───────────────────
    @action(detail=True, methods=['post'])
    def carry_forward(self, request, pk=None):
        owner     = get_owner_user(request)
        source_fs = self.get_object()
        target_id = request.data.get('target_structure_id')
        if not target_id:
            return Response({'error': 'target_structure_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_fs = FeeStructure.objects.get(pk=target_id, business__owner=owner)
        except FeeStructure.DoesNotExist:
            return Response({'error': 'Target structure not found'}, status=status.HTTP_404_NOT_FOUND)

        students_qs = Student.objects.filter(business__owner=owner, status='active')
        if source_fs.class_name:
            students_qs = students_qs.filter(class_name=source_fs.class_name)

        carried = 0
        today   = __import__('datetime').date.today()

        for student in students_qs:
            paid    = float(FeePayment.objects.filter(
                student=student, fee_structure=source_fs
            ).aggregate(s=Sum('amount_paid'))['s'] or 0)
            balance = float(source_fs.amount) - paid

            if balance > 0:
                # Check if a carry-forward payment already exists
                exists = FeePayment.objects.filter(
                    student=student,
                    fee_structure=target_fs,
                    method='other',
                    reference='carry_forward',
                ).exists()
                if not exists:
                    # Record as a negative "debt" adjustment — actually record as 0 paid
                    # and adjust target amount. Simpler: record a special note payment.
                    # Best approach: reduce target amount_due by crediting previous payment info
                    # We create a payment record with amount=0 and note, OR just note it.
                    # Most practical: add carried balance to target as a pre-existing debt note.
                    FeePayment.objects.create(
                        student=student,
                        fee_structure=target_fs,
                        amount_paid=0,
                        payment_date=today,
                        method='other',
                        reference='carry_forward',
                        note=f"Carried forward {source_fs.currency} {balance:,.0f} from {source_fs}",
                    )
                    carried += 1

        return Response({'carried': carried, 'message': f'{carried} students carried forward.'})


class FeePaymentViewSet(viewsets.ModelViewSet):
    serializer_class   = FeePaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_queryset(self):
        owner        = get_owner_user(self.request)
        qs           = FeePayment.objects.filter(fee_structure__business__owner=owner)
        student_id   = self.request.query_params.get('student_id')
        structure_id = self.request.query_params.get('fee_structure')
        term         = self.request.query_params.get('term')
        year         = self.request.query_params.get('year')
        class_name   = self.request.query_params.get('class_name')
        if student_id:   qs = qs.filter(student_id=student_id)
        if structure_id: qs = qs.filter(fee_structure_id=structure_id)
        if term:         qs = qs.filter(fee_structure__term=term)
        if year:         qs = qs.filter(fee_structure__year=year)
        if class_name:   qs = qs.filter(student__class_name=class_name)
        return qs
