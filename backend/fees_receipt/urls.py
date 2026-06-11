from django.urls import path
from .views import FeeReceiptView, BulkReceiptListView

urlpatterns = [
    path('receipt/<int:payment_id>/', FeeReceiptView.as_view(), name='fee-receipt'),
    path('receipts/bulk/',            BulkReceiptListView.as_view(), name='receipt-bulk'),
]
