import uuid
from django.db import models
from django.contrib.auth.models import User


class SchoolSettings(models.Model):
    business = models.OneToOneField(
        'Business', on_delete=models.CASCADE, related_name='school_settings'
    )
    school_name  = models.CharField(max_length=255, blank=True)
    motto        = models.CharField(max_length=255, blank=True)
    location     = models.CharField(max_length=255, blank=True)
    po_box       = models.CharField(max_length=100, blank=True)
    # UNEB numbers — primary vs secondary
    uneb_pri_no  = models.CharField(max_length=100, blank=True)
    uneb_olevel_center_no = models.CharField(max_length=100, blank=True)
    uneb_alevel_center_no = models.CharField(max_length=100, blank=True)
    # Images stored on Cloudinary
    logo  = models.ImageField(upload_to='school/logos/',  blank=True, null=True)
    stamp = models.ImageField(upload_to='school/stamps/', blank=True, null=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.business.name}"


class Business(models.Model):
    SCHOOL_LEVEL_CHOICES = [('primary', 'Primary'), ('secondary', 'Secondary')]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='businesses', null=True)
    uid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)  # immutable tenant ID
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    school_level = models.CharField(max_length=20, choices=SCHOOL_LEVEL_CHOICES, blank=True, default='')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Dashboard(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='dashboards')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
