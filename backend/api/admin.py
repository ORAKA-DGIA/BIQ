from django.contrib import admin
from .models import Business, Dashboard


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    list_filter = ['created_at']


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ['title', 'business', 'created_at', 'updated_at']
    search_fields = ['title', 'description']
    list_filter = ['business', 'created_at']
    raw_id_fields = ['business']
