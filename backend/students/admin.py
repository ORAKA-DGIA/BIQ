from django.contrib import admin
from .models import Student


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'student_id', 'class_name', 'section', 'status', 'business']
    list_filter = ['status', 'gender', 'class_name', 'business']
    search_fields = ['first_name', 'last_name', 'student_id']
