from django.contrib import admin
from .models import Attendance

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ['student', 'date', 'term', 'year', 'status', 'note']
    list_filter   = ['status', 'term', 'year', 'date']
    search_fields = ['student__first_name', 'student__last_name']
