import random, string
from django.db import models
from django.contrib.auth.models import User
from api.models import Business


SCHOOL_MODULES = [
    ('overview',    'Dashboard'),
    ('students',    'Students'),
    ('marks',       'Marks Entry'),
    ('attendance',  'Attendance'),
    ('reportcards', 'Report Cards'),
    ('fees',        'Fees'),
    ('payments',    'Payments'),
    ('accounting',  'Accounting'),
    ('settings',    'Settings'),
]

ADDITIONAL_ROLES = [
    ('class_teacher',  'Class Teacher'),
    ('deputy_head',    'Deputy Head Teacher'),
    ('head_teacher',   'Head Teacher'),
    ('dos',            'Director of Studies'),
    ('bursar',         'Bursar'),
    ('librarian',      'Librarian'),
    ('sports',         'Sports Master/Mistress'),
    ('none',           'None'),
]


def _otp():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Staff(models.Model):
    business        = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='staff')
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile', null=True, blank=True)
    full_name       = models.CharField(max_length=255)
    location        = models.CharField(max_length=255, blank=True)
    subjects        = models.JSONField(default=list, blank=True)   # ["Math","English",…]
    assigned_classes = models.JSONField(default=list, blank=True)  # ["S.4","S.5",…]
    assigned_pages  = models.JSONField(default=list, blank=True)   # ["students","marks",…]
    additional_role = models.CharField(max_length=50, choices=ADDITIONAL_ROLES, default='none', blank=True)
    sign            = models.ImageField(upload_to='staff/signs/', blank=True, null=True)

    # Access credentials
    email_prefix    = models.CharField(max_length=100, blank=True)   # "john.doe"  → user logs in with john.doe@<domain>
    otp             = models.CharField(max_length=8, blank=True)      # 8-char OTP shown to admin
    otp_used        = models.BooleanField(default=False)              # becomes True after first login + password set
    is_active       = models.BooleanField(default=True)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return self.full_name

    def generate_otp(self):
        self.otp = _otp()
        self.otp_used = False
        self.save(update_fields=['otp', 'otp_used', 'email_prefix', 'user'])
        return self.otp
