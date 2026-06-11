from rest_framework import serializers
from .models import Student, Mark


class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)
    photo_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'business', 'full_name', 'photo_url', 'photo_upload_status',
            'photo',
            'first_name', 'last_name', 'student_id',
            'date_of_birth', 'gender', 'class_name', 'section',
            'admission_date', 'status',
            'parent_name', 'parent_phone', 'parent_email',
            'address', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'photo': {'required': False, 'allow_null': True, 'write_only': True},
        }

    def get_full_name(self, obj):
        first = (obj.first_name or '').strip()
        last = (obj.last_name or '').strip()
        full = f"{first} {last}".strip()
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
        except Exception as e:
            print(f"Error getting photo URL for student {obj.id}: {e}")
            return None

    def create(self, validated_data):
        """Override create to handle photo upload with Cloudinary."""
        student = Student.objects.create(**validated_data)
        return student

    def update(self, instance, validated_data):
        """Override update to handle photo upload with Cloudinary."""
        # Handle photo field explicitly
        photo = validated_data.pop('photo', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Handle photo: if empty string, delete photo; if file, save it
        if 'photo' in self.initial_data:
            if self.initial_data['photo'] == '' or self.initial_data['photo'] is None:
                instance.photo.delete(save=False)
                instance.photo = None
            elif photo:
                instance.photo = photo
        
        instance.save()
        return instance


def uganda_grade(score, max_score):
    """Uganda O-Level A-E grading scale."""
    pct = (float(score) / float(max_score) * 100) if max_score and float(max_score) > 0 else 0
    if pct >= 80: return 'A'
    if pct >= 70: return 'B'
    if pct >= 60: return 'C'
    if pct >= 50: return 'D'
    return 'E'


class MarkSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField(read_only=True)
    class_name   = serializers.SerializerMethodField(read_only=True)
    percentage   = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Mark
        fields = [
            'id', 'student', 'student_name', 'class_name',
            'subject', 'assessment', 'term', 'year', 'score', 'max_score', 'grade', 'comment',
            'percentage', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_student_name(self, obj): return str(obj.student)
    def get_class_name(self, obj):   return obj.student.class_name
    def get_percentage(self, obj):
        if obj.max_score and obj.max_score > 0:
            return round(float(obj.score) / float(obj.max_score) * 100, 1)
        return None

    def _set_grade(self, instance, validated_data):
        score     = validated_data.get('score',     instance.score     if instance else 0)
        max_score = validated_data.get('max_score', instance.max_score if instance else 100)
        validated_data['grade'] = uganda_grade(score, max_score)
        return validated_data

    def create(self, validated_data):
        return super().create(self._set_grade(None, validated_data))

    def update(self, instance, validated_data):
        return super().update(instance, self._set_grade(instance, validated_data))
