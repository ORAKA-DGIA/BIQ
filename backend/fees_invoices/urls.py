from django.urls import path
from .views import DebtorListView, InvoiceDetailView, BulkInvoiceListView

urlpatterns = [
    path('invoices/debtors/',                             DebtorListView.as_view(),    name='invoice-debtors'),
    path('invoices/bulk/',                                BulkInvoiceListView.as_view(), name='invoice-bulk'),
    path('invoices/<int:student_id>/<int:structure_id>/', InvoiceDetailView.as_view(), name='invoice-detail'),
]
