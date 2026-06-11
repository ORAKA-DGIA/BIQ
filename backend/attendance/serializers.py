from rest_framework import serializers
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField(read_only=True)
    class_name   = serializers.SerializerMethodField(read_only=True)
    section      = serializers.SerializerMethodField(read_only=True)
    photo_url    = serializers.SerializerMethodField(read_only=True)
    full_name    = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Attendance
        fields = [
            'id', 'student', 'student_name', 'full_name', 'class_name', 'section',
            'photo_url', 'date', 'term', 'year', 'status', 'note',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_student_name(self, obj): return str(obj.student)
    def get_full_name(self, obj):    return f"{obj.student.first_name} {obj.student.last_name}".strip()
    def get_class_name(self, obj):   return obj.student.class_name
    def get_section(self, obj):      return obj.student.section

    def get_photo_url(self, obj):
        if not obj.student.photo:
            return None
        request = self.context.get('request')
        try:
            url = obj.student.photo.url
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None
