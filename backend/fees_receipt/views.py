from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from fees.models import FeePayment
from .models import Receipt
from .serializers import FeeReceiptSerializer
from api.views import get_owner_user


class FeeReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id):
        owner = get_owner_user(request)
        try:
            payment = FeePayment.objects.select_related(
                'student', 'fee_structure', 'fee_structure__business'
            ).get(pk=payment_id, fee_structure__business__owner=owner)
        except FeePayment.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        Receipt.objects.get_or_create(payment=payment)
        payment.refresh_from_db()
        payment = FeePayment.objects.select_related(
            'student', 'fee_structure', 'fee_structure__business', 'receipt'
        ).get(pk=payment_id)

        serializer = FeeReceiptSerializer(payment, context={'request': request})
        return Response(serializer.data)


class BulkReceiptListView(APIView):
    """
    GET /api/receipts/bulk/?date_from=2025-01-01&date_to=2025-01-31&class_name=S.4&term=1&year=2025
    Returns all payments matching filters, ready for bulk print.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner      = get_owner_user(request)
        date_from  = request.query_params.get('date_from')
        date_to    = request.query_params.get('date_to')
        class_name = request.query_params.get('class_name', '')
        term       = request.query_params.get('term')
        year       = request.query_params.get('year')

        qs = FeePayment.objects.select_related(
            'student', 'fee_structure', 'fee_structure__business'
        ).filter(
            fee_structure__business__owner=owner
        ).exclude(reference='carry_forward')

        if date_from:  qs = qs.filter(payment_date__gte=date_from)
        if date_to:    qs = qs.filter(payment_date__lte=date_to)
        if class_name: qs = qs.filter(student__class_name=class_name)
        if term:       qs = qs.filter(fee_structure__term=term)
        if year:       qs = qs.filter(fee_structure__year=year)

        qs = qs.order_by('student__class_name', 'student__first_name', 'payment_date')

        for p in qs:
            Receipt.objects.get_or_create(payment=p)

        # Re-fetch with receipt relation
        ids = list(qs.values_list('id', flat=True))
        payments = FeePayment.objects.select_related(
            'student', 'fee_structure', 'fee_structure__business', 'receipt'
        ).filter(id__in=ids).order_by('student__class_name', 'student__first_name', 'payment_date')

        serializer = FeeReceiptSerializer(payments, many=True, context={'request': request})
        return Response(serializer.data)
