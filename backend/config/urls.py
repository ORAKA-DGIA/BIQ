"""
URL configuration for BIQ backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/', include('students.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('fees.urls')),
    path('api/', include('fees_receipt.urls')),
    path('api/', include('fees_invoices.urls')),
    path('api/staff/', include('staff.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
