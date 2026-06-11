from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Business, Dashboard, SchoolSettings
from students.models import Student, Mark


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)
    photo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'first_name', 'last_name', 'full_name', 'student_id',
                  'class_name', 'section', 'gender', 'status',
                  'photo_url', 'photo_upload_status']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full if full else f"Student {obj.id}"

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get('request')
        try:
            url = obj.photo.url
            if url.startswith('http'):
                return url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None


def uganda_grade(score, max_score):
    """Uganda O-Level A-E grading scale."""
    pct = (float(score) / float(max_score) * 100) if max_score and float(max_score) > 0 else 0
    if pct >= 80: return 'A'
    if pct >= 70: return 'B'
    if pct >= 60: return 'C'
    if pct >= 50: return 'D'
    return 'E'


class MarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mark
        fields = ['id', 'student', 'subject', 'assessment', 'term', 'year', 'score', 'max_score', 'grade', 'comment']
        read_only_fields = ['id']

    def _set_grade(self, instance, validated_data):
        score     = validated_data.get('score',     instance.score     if instance else 0)
        max_score = validated_data.get('max_score', instance.max_score if instance else 100)
        validated_data['grade'] = uganda_grade(score, max_score)
        return validated_data

    def create(self, validated_data):
        return super().create(self._set_grade(None, validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._set_grade(instance, validated_data))


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True)
    businessName = serializers.CharField(max_length=255)
    businessType = serializers.CharField(max_length=100)
    schoolLevel = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['name']
        )
        Business.objects.create(
            owner=user,
            name=validated_data['businessName'],
            category=validated_data['businessType'],
            school_level=validated_data.get('schoolLevel', ''),
            description=''
        )
        return user


class SchoolSettingsSerializer(serializers.ModelSerializer):
    logo_url  = serializers.SerializerMethodField(read_only=True)
    stamp_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SchoolSettings
        fields = [
            'id', 'school_name', 'motto', 'location', 'po_box',
            'uneb_pri_no', 'uneb_olevel_center_no', 'uneb_alevel_center_no',
            'logo', 'logo_url', 'stamp', 'stamp_url', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']
        extra_kwargs = {'logo': {'write_only': True, 'required': False},
                        'stamp': {'write_only': True, 'required': False}}

    def _abs_url(self, field_value):
        if not field_value:
            return None
        url = field_value.url if hasattr(field_value, 'url') else str(field_value)
        if url.startswith('http'):
            return url
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_logo_url(self, obj):  return self._abs_url(obj.logo)
    def get_stamp_url(self, obj): return self._abs_url(obj.stamp)


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = ['id', 'uid', 'name', 'category', 'school_level', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'uid', 'created_at', 'updated_at']


class DashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dashboard
        fields = ['id', 'business', 'title', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
