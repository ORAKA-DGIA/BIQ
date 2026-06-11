from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StaffViewSet, staff_otp_verify, staff_set_password, staff_otp_login, staff_me

router = DefaultRouter()
router.register(r'', StaffViewSet, basename='staff')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/otp-verify/',    staff_otp_verify,    name='staff-otp-verify'),
    path('auth/set-password/',  staff_set_password,  name='staff-set-password'),
    path('auth/otp-login/',     staff_otp_login,     name='staff-otp-login'),
    path('auth/me/',            staff_me,            name='staff-me'),
]
