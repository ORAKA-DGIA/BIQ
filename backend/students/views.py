import threading
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Student, Mark
from .serializers import StudentSerializer, MarkSerializer
from api.views import get_owner_user


def _upload_photo_async(student_id, file_content, file_name):
    try:
        from django.core.files.base import ContentFile
        student = Student.objects.get(pk=student_id)
        student.photo.save(file_name, ContentFile(file_content), save=False)
        student.photo_upload_status = 'done'
        student.save(update_fields=['photo', 'photo_upload_status'])
    except Exception:
        try:
            Student.objects.filter(pk=student_id).update(photo_upload_status='failed')
        except Exception:
            pass


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'student_id', 'class_name']
    ordering_fields = ['class_name', 'last_name', 'admission_date', 'created_at']

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_queryset(self):
        owner = get_owner_user(self.request)
        qs = Student.objects.filter(business__owner=owner)
        business_id = self.request.query_params.get('business_id')
        if business_id:
            qs = qs.filter(business_id=business_id)
        class_name = self.request.query_params.get('class_name')
        if class_name:
            qs = qs.filter(class_name=class_name)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def _handle_photo_async(self, student, request):
        photo_file = request.FILES.get('photo')
        if not photo_file:
            return
        file_content = photo_file.read()
        file_name = photo_file.name
        student.photo_upload_status = 'pending'
        student.save(update_fields=['photo_upload_status'])
        t = threading.Thread(
            target=_upload_photo_async,
            args=(student.pk, file_content, file_name),
            daemon=True
        )
        t.start()

    def perform_create(self, serializer):
        student = serializer.save()
        self._handle_photo_async(student, self.request)

    def perform_update(self, serializer):
        student = serializer.save()
        self._handle_photo_async(student, self.request)


class MarkViewSet(viewsets.ModelViewSet):
    serializer_class = MarkSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['term', 'subject', 'score', 'created_at']

    def get_queryset(self):
        owner = get_owner_user(self.request)
        qs = Mark.objects.filter(student__business__owner=owner)
        student_id  = self.request.query_params.get('student_id')
        business_id = self.request.query_params.get('business_id')
        class_name  = self.request.query_params.get('class_name')
        subject     = self.request.query_params.get('subject')
        if student_id:  qs = qs.filter(student_id=student_id)
        if business_id: qs = qs.filter(student__business_id=business_id)
        if class_name:  qs = qs.filter(student__class_name=class_name)
        if subject:     qs = qs.filter(subject=subject)
        return qs
