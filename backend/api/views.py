from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.db.models import Q, F, Count, Sum
from django.utils import timezone
from .models import Business, Dashboard, SchoolSettings
from students.models import Student, Mark
from attendance.models import Attendance
from fees.models import FeeStructure, FeePayment
from .serializers import (
    BusinessSerializer, DashboardSerializer, RegisterSerializer, UserSerializer,
    StudentSerializer, MarkSerializer, SchoolSettingsSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'user': UserSerializer(user).data, 'token': token.key}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    if not email or not password:
        return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(username=email)
        if user.check_password(password):
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'user': UserSerializer(user).data, 'token': token.key})
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    owner       = get_owner_user(request)
    business_id = request.query_params.get('business_id')

    students_qs = Student.objects.filter(business__owner=owner, status='active')
    if business_id:
        students_qs = students_qs.filter(business_id=business_id)

    total_students = students_qs.count()
    total_classes  = students_qs.values('class_name').distinct().count()

    # Today's attendance rate
    today = timezone.localdate()
    att_qs = Attendance.objects.filter(
        student__business__owner=owner,
        date=today,
    )
    if business_id:
        att_qs = att_qs.filter(student__business_id=business_id)
    att_total   = att_qs.count()
    att_present = att_qs.filter(status__in=['present', 'late']).count()
    attendance_pct = round((att_present / att_total * 100)) if att_total > 0 else None

    # Fee collection — current year, sum all payments
    current_year = today.year
    fees_qs = FeePayment.objects.filter(
        fee_structure__business__owner=owner,
    )
    if business_id:
        fees_qs = fees_qs.filter(fee_structure__business_id=business_id)

    total_collected = float(fees_qs.filter(
        fee_structure__year=current_year
    ).aggregate(s=Sum('amount_paid'))['s'] or 0)

    # Expected fees this year
    fs_qs = FeeStructure.objects.filter(business__owner=owner, year=current_year)
    if business_id:
        fs_qs = fs_qs.filter(business_id=business_id)
    total_expected = 0
    for fs in fs_qs:
        stu = students_qs.filter(class_name=fs.class_name) if fs.class_name else students_qs
        total_expected += float(fs.amount) * stu.count()

    # Recent students (last 5 enrolled)
    recent_students = list(
        students_qs.order_by('-created_at')[:5].values(
            'id', 'first_name', 'last_name', 'class_name', 'created_at'
        )
    )
    for s in recent_students:
        s['created_at'] = s['created_at'].date().isoformat()

    # Fee currency (take from first structure)
    currency = 'UGX'
    first_fs = fs_qs.first()
    if first_fs:
        currency = first_fs.currency

    return Response({
        'total_students':   total_students,
        'total_classes':    total_classes,
        'attendance_today': attendance_pct,
        'attendance_taken': att_total > 0,
        'fee_collected':    total_collected,
        'fee_expected':     total_expected,
        'fee_outstanding':  max(0, total_expected - total_collected),
        'currency':         currency,
        'recent_students':  recent_students,
    })


def get_owner_user(request):
    """Return the business-owner User for any request (staff or owner)."""
    try:
        staff = request.user.staff_profile
        return staff.business.owner
    except Exception:
        return request.user


class SchoolSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_business(self, request, business_id):
        owner = get_owner_user(request)
        return Business.objects.get(pk=business_id, owner=owner)

    def retrieve(self, request, pk=None):
        try:
            business = self._get_business(request, pk)
        except Business.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        obj, _ = SchoolSettings.objects.get_or_create(business=business)
        return Response(SchoolSettingsSerializer(obj, context={'request': request}).data)

    def partial_update(self, request, pk=None):
        try:
            business = self._get_business(request, pk)
        except Business.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        obj, _ = SchoolSettings.objects.get_or_create(business=business)
        serializer = SchoolSettingsSerializer(
            obj, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class BusinessViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessSerializer

    def get_queryset(self):
        owner = get_owner_user(self.request)
        return Business.objects.filter(owner=owner)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def dashboards(self, request, pk=None):
        business = self.get_object()
        serializer = DashboardSerializer(business.dashboards.all(), many=True)
        return Response(serializer.data)


class DashboardViewSet(viewsets.ModelViewSet):
    serializer_class = DashboardSerializer

    def get_queryset(self):
        queryset = Dashboard.objects.filter(business__owner=self.request.user)
        business_id = self.request.query_params.get('business_id')
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        return queryset


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_queryset(self):
        owner = get_owner_user(self.request)
        queryset = Student.objects.filter(business__owner=owner)
        business_id = self.request.query_params.get('business_id')
        class_name = self.request.query_params.get('class_name')
        section = self.request.query_params.get('section')
        if business_id:
            queryset = queryset.filter(business_id=business_id)
        if class_name:
            queryset = queryset.filter(class_name=class_name)
        if section:
            queryset = queryset.filter(section=section)
        return queryset

    def perform_create(self, serializer):
        """Handle create with photo upload."""
        if 'photo' in self.request.FILES:
            # Photo will be saved to Cloudinary when serializer.save() is called
            try:
                instance = serializer.save(photo_upload_status='done')
                return instance
            except Exception as e:
                print(f"Error uploading photo: {e}")
                # Still save the student even if photo fails
                serializer.save(photo_upload_status='failed')
        else:
            serializer.save(photo_upload_status='done')

    def perform_update(self, serializer):
        """Handle update with photo upload."""
        try:
            if 'photo' in self.request.FILES:
                # Photo will be saved to Cloudinary when serializer.save() is called
                instance = serializer.save(photo_upload_status='done')
                return instance
            elif self.request.data.get('photo') == '':
                # Photo is being deleted
                serializer.save(photo_upload_status='done')
            else:
                serializer.save()
        except Exception as e:
            print(f"Error updating student/photo: {e}")
            serializer.save(photo_upload_status='failed')


class MarkViewSet(viewsets.ModelViewSet):
    serializer_class = MarkSerializer

    def get_queryset(self):
        owner = get_owner_user(self.request)
        queryset = Mark.objects.filter(student__business__owner=owner)
        subject    = self.request.query_params.get('subject')
        class_name = self.request.query_params.get('class_name')
        section    = self.request.query_params.get('section')
        term       = self.request.query_params.get('term')
        year       = self.request.query_params.get('year')
        student_id = self.request.query_params.get('student_id')

        if student_id: queryset = queryset.filter(student_id=student_id)
        if subject:    queryset = queryset.filter(subject=subject)
        if class_name: queryset = queryset.filter(student__class_name=class_name)
        if section:    queryset = queryset.filter(student__section=section)
        if term:       queryset = queryset.filter(term=term)
        if year:       queryset = queryset.filter(year=year)
        return queryset

    @action(detail=False, methods=['get'])
    def subjects(self, request):
        owner       = get_owner_user(request)
        class_name  = request.query_params.get('class_name')
        business_id = request.query_params.get('business_id')
        term        = request.query_params.get('term')
        year        = request.query_params.get('year')

        queryset = Mark.objects.filter(student__business__owner=owner)
        if business_id: queryset = queryset.filter(student__business_id=business_id)
        if class_name:  queryset = queryset.filter(student__class_name=class_name)
        if term:        queryset = queryset.filter(term=term)
        if year:        queryset = queryset.filter(year=year)

        subjects = queryset.values_list('subject', flat=True).distinct().order_by('subject')
        return Response({'subjects': list(subjects)})

    @action(detail=False, methods=['get'])
    def assessment_types(self, request):
        owner       = get_owner_user(request)
        subject     = request.query_params.get('subject')
        business_id = request.query_params.get('business_id')
        term        = request.query_params.get('term')
        year        = request.query_params.get('year')

        if not subject:
            return Response({'error': 'subject parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = Mark.objects.filter(subject=subject, student__business__owner=owner)
        if business_id: queryset = queryset.filter(student__business_id=business_id)
        if term:        queryset = queryset.filter(term=term)
        if year:        queryset = queryset.filter(year=year)

        assessment_types = queryset.values_list('assessment', flat=True).distinct().order_by('assessment')
        return Response({'assessment_types': list(assessment_types)})
