from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Attendance
from .serializers import AttendanceSerializer
from students.models import Student
from api.views import get_owner_user


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class   = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_queryset(self):
        owner      = get_owner_user(self.request)
        qs         = Attendance.objects.filter(student__business__owner=owner)
        class_name = self.request.query_params.get('class_name')
        section    = self.request.query_params.get('section')
        date       = self.request.query_params.get('date')
        term       = self.request.query_params.get('term')
        year       = self.request.query_params.get('year')
        student_id = self.request.query_params.get('student_id')

        if class_name: qs = qs.filter(student__class_name=class_name)
        if section:    qs = qs.filter(student__section=section)
        if date:       qs = qs.filter(date=date)
        if term:       qs = qs.filter(term=term)
        if year:       qs = qs.filter(year=year)
        if student_id: qs = qs.filter(student_id=student_id)
        return qs

    @action(detail=False, methods=['post'])
    def bulk_save(self, request):
        """
        Save attendance for a whole class on a given date.
        Expects: { records: [{ student, date, term, year, status, note }, ...] }
        Creates or updates each record (upsert on student+date).
        """
        records = request.data.get('records', [])
        if not records:
            return Response({'error': 'No records provided'}, status=status.HTTP_400_BAD_REQUEST)

        saved = []
        errors = []
        for rec in records:
            student_id = rec.get('student')
            date       = rec.get('date')
            # Verify ownership
            owner = get_owner_user(request)
            try:
                student = Student.objects.get(pk=student_id, business__owner=owner)
            except Student.DoesNotExist:
                errors.append({'student': student_id, 'error': 'Not found'})
                continue

            obj, _ = Attendance.objects.update_or_create(
                student=student,
                date=date,
                defaults={
                    'term':   rec.get('term', '1'),
                    'year':   rec.get('year', 2025),
                    'status': rec.get('status', 'present'),
                    'note':   rec.get('note', ''),
                }
            )
            saved.append(AttendanceSerializer(obj, context={'request': request}).data)

        return Response({'saved': len(saved), 'errors': errors}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        class_name = request.query_params.get('class_name')
        term       = request.query_params.get('term')
        year       = request.query_params.get('year')
        student_id = request.query_params.get('student_id')

        owner      = get_owner_user(request)
        qs = Attendance.objects.filter(student__business__owner=owner)
        if class_name: qs = qs.filter(student__class_name=class_name)
        if term:       qs = qs.filter(term=term)
        if year:       qs = qs.filter(year=year)
        if student_id: qs = qs.filter(student_id=student_id)

        from django.db.models import Count, Q
        summary = qs.values('student').annotate(
            total   = Count('id'),
            present = Count('id', filter=Q(status='present')),
            absent  = Count('id', filter=Q(status='absent')),
            late    = Count('id', filter=Q(status='late')),
            excused = Count('id', filter=Q(status='excused')),
        )
        return Response(list(summary))
