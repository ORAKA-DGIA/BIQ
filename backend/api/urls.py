from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusinessViewSet, DashboardViewSet, StudentViewSet, MarkViewSet, SchoolSettingsViewSet, register, login, me, dashboard_stats

router = DefaultRouter()
router.register(r'businesses', BusinessViewSet, basename='business')
router.register(r'dashboards', DashboardViewSet, basename='dashboard')
router.register(r'students', StudentViewSet, basename='student')
router.register(r'marks', MarkViewSet, basename='mark')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/me/', me, name='me'),
    path('school-settings/<int:pk>/', SchoolSettingsViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='school-settings'),
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
]
