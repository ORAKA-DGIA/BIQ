from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, MarkViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'marks', MarkViewSet, basename='mark')

urlpatterns = [
    path('', include(router.urls)),
]
