from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Staff, SCHOOL_MODULES, ADDITIONAL_ROLES


def _slugify_domain(name):
    NOISE = {'secondary', 'primary', 'school', 'college', 'high',
             'academy', 'institute', 'junior', 'senior', 'the'}
    words = name.strip().split()
    clean = [w for w in words if w.lower() not in NOISE]
    if not clean:
        clean = words
    if len(clean) >= 2 and len(clean[0]) <= 3:
        slug_words = clean[:2]
    else:
        slug_words = clean[:1]
    slug = ''.join(''.join(c for c in w if c.isalnum()) for w in slug_words).lower()
    return (slug or 'school') + '.com'


class StaffSerializer(serializers.ModelSerializer):
    sign_url         = serializers.SerializerMethodField(read_only=True)
    domain           = serializers.SerializerMethodField(read_only=True)
    subjects         = serializers.ListField(child=serializers.CharField(), default=list)
    assigned_classes = serializers.ListField(child=serializers.CharField(), default=list)
    assigned_pages   = serializers.ListField(child=serializers.CharField(), default=list)

    class Meta:
        model  = Staff
        fields = [
            'id', 'full_name', 'location', 'subjects', 'assigned_classes', 'assigned_pages',
            'additional_role', 'sign', 'sign_url',
            'email_prefix', 'otp', 'otp_used', 'is_active',
            'domain', 'created_at',
        ]
        read_only_fields = ['id', 'otp', 'otp_used', 'created_at']
        extra_kwargs = {'sign': {'write_only': True, 'required': False}}

    def _abs_url(self, val):
        if not val: return None
        url = val.url if hasattr(val, 'url') else str(val)
        if url.startswith('http'): return url
        req = self.context.get('request')
        return req.build_absolute_uri(url) if req else url

    def get_sign_url(self, obj): return self._abs_url(obj.sign)

    def get_domain(self, obj):
        short = str(obj.business.uid).replace('-', '')[:10].lower()
        return f"{short}.biq"


class StaffAccessSerializer(serializers.Serializer):
    """Used when granting access — admin supplies email_prefix."""
    email_prefix = serializers.CharField(max_length=100)

    def validate_email_prefix(self, val):
        val = val.strip().lower()
        if '@' in val:
            raise serializers.ValidationError("Do not include @ or domain — just the prefix, e.g. 'john.doe'")
        if not val:
            raise serializers.ValidationError("Email prefix is required.")
        return val


class StaffOTPLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp   = serializers.CharField(min_length=8, max_length=8)


class StaffSetPasswordSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    otp      = serializers.CharField(min_length=8, max_length=8)
    password = serializers.CharField(min_length=6, write_only=True)
    confirm  = serializers.CharField(min_length=6, write_only=True)

    def validate(self, data):
        if data['password'] != data['confirm']:
            raise serializers.ValidationError({'confirm': 'Passwords do not match.'})
        return data
