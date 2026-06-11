from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeeStructureViewSet, FeePaymentViewSet

router = DefaultRouter()
router.register(r'fee-structures', FeeStructureViewSet, basename='fee-structure')
router.register(r'fee-payments',   FeePaymentViewSet,   basename='fee-payment')

urlpatterns = [
    path('', include(router.urls)),
]
