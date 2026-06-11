from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from api.models import Business
from api.serializers import UserSerializer
from .models import Staff
from .serializers import (
    StaffSerializer, StaffAccessSerializer,
    StaffOTPLoginSerializer, StaffSetPasswordSerializer,
)


def _domain_for_business(business):
    """Collision-proof domain derived from the immutable business UUID."""
    short = str(business.uid).replace('-', '')[:10].lower()
    return f"{short}.biq"


class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'request': self.request}

    def get_queryset(self):
        try:
            # Staff user: can only see staff in their own business
            biz = self.request.user.staff_profile.business
        except Exception:
            biz = None

        if biz:
            qs = Staff.objects.filter(business=biz)
        else:
            qs = Staff.objects.filter(business__owner=self.request.user)

        bid = self.request.query_params.get('business_id')
        if bid:
            qs = qs.filter(business_id=bid)
        return qs

    def perform_create(self, serializer):
        from api.views import get_owner_user
        owner = get_owner_user(self.request)
        business = Business.objects.get(
            pk=self.request.data.get('business_id'), owner=owner
        )
        serializer.save(business=business)

    def perform_update(self, serializer):
        if 'sign' in self.request.FILES:
            serializer.save(sign=self.request.FILES['sign'])
        else:
            serializer.save()

    @action(detail=True, methods=['post'], url_path='give-access')
    def give_access(self, request, pk=None):
        """Admin gives a staff member login access."""
        staff = self.get_object()
        ser = StaffAccessSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        prefix = ser.validated_data['email_prefix']
        domain = _domain_for_business(staff.business)
        full_email = f"{prefix}@{domain}"

        # Create or update the Django User
        user, created = User.objects.get_or_create(
            username=full_email,
            defaults={'email': full_email, 'first_name': staff.full_name}
        )
        if not created:
            user.first_name = staff.full_name
            user.save(update_fields=['first_name'])

        staff.email_prefix = prefix
        staff.user = user
        staff.save(update_fields=['email_prefix', 'user'])
        otp = staff.generate_otp()   # saves otp + otp_used

        return Response({
            'email': full_email,
            'otp': otp,
            'domain': domain,
        })

    @action(detail=True, methods=['post'], url_path='regenerate-otp')
    def regenerate_otp(self, request, pk=None):
        staff = self.get_object()
        if not staff.email_prefix:
            return Response({'error': 'Give access first.'}, status=status.HTTP_400_BAD_REQUEST)
        otp = staff.generate_otp()
        domain = _domain_for_business(staff.business)
        return Response({'email': f"{staff.email_prefix}@{domain}", 'otp': otp})


# ── Public endpoints (no auth required) ──────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_me(request):
    """Returns the latest staff profile for the currently logged-in staff user."""
    try:
        staff = request.user.staff_profile
    except Exception:
        return Response({'error': 'Not a staff account.'}, status=status.HTTP_403_FORBIDDEN)

    from api.serializers import BusinessSerializer
    return Response({
        'staff_id':        staff.id,
        'full_name':       staff.full_name,
        'subjects':        staff.subjects,
        'assigned_classes': staff.assigned_classes,
        'assigned_pages':  staff.assigned_pages,
        'additional_role': staff.additional_role,
        'business_id':     staff.business_id,
        'business':        BusinessSerializer(staff.business).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_otp_verify(request):
    ser = StaffOTPLoginSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    email = ser.validated_data['email'].lower()
    otp   = ser.validated_data['otp'].upper()

    try:
        user = User.objects.get(username=email)
    except User.DoesNotExist:
        return Response({'error': 'Invalid email or OTP.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        staff = user.staff_profile
    except Exception:
        return Response({'error': 'Invalid email or OTP.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not staff.otp or staff.otp != otp:
        return Response({'error': 'Invalid email or OTP.'}, status=status.HTTP_401_UNAUTHORIZED)

    return Response({
        'valid': True,
        'staff_id': staff.id,
        'full_name': staff.full_name,
        'subjects': staff.subjects,
        'assigned_pages': staff.assigned_pages,
        'additional_role': staff.additional_role,
        'otp_used': staff.otp_used,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_set_password(request):
    ser = StaffSetPasswordSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    email    = ser.validated_data['email'].lower()
    otp      = ser.validated_data['otp'].upper()
    password = ser.validated_data['password']

    try:
        user = User.objects.get(username=email)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        staff = user.staff_profile
    except Exception:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not staff.otp or staff.otp != otp:
        return Response({'error': 'Invalid OTP.'}, status=status.HTTP_401_UNAUTHORIZED)

    user.set_password(password)
    user.save()
    staff.otp_used = True
    staff.save(update_fields=['otp_used'])

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': UserSerializer(user).data,
        'staff_id': staff.id,
        'full_name': staff.full_name,
        'subjects': staff.subjects,
        'assigned_classes': staff.assigned_classes,
        'assigned_pages': staff.assigned_pages,
        'additional_role': staff.additional_role,
        'business_id': staff.business_id,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def staff_otp_login(request):
    email    = (request.data.get('email') or '').lower()
    password = request.data.get('password', '')

    try:
        user = User.objects.get(username=email)
    except User.DoesNotExist:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        staff = user.staff_profile
    except Exception:
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.check_password(password):
        return Response({'error': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': UserSerializer(user).data,
        'staff_id': staff.id,
        'full_name': staff.full_name,
        'subjects': staff.subjects,
        'assigned_classes': staff.assigned_classes,
        'assigned_pages': staff.assigned_pages,
        'additional_role': staff.additional_role,
        'business_id': staff.business_id,
    })
