import os
from django.core.management.base import BaseCommand
from django.core.files import File
from students.models import Student


class Command(BaseCommand):
    help = 'Migrate existing local student photos to Cloudinary'

    def handle(self, *args, **kwargs):
        students = Student.objects.exclude(photo='').exclude(photo=None)
        total = students.count()

        if total == 0:
            self.stdout.write('No student photos to migrate.')
            return

        self.stdout.write(f'Migrating {total} student photo(s) to Cloudinary...')
        success = 0

        for student in students:
            # Skip if already on Cloudinary (no local path)
            try:
                local_path = student.photo.path
            except NotImplementedError:
                self.stdout.write(f'  [OK] {student} - already on Cloudinary, skipping.')
                continue

            if not local_path or not os.path.exists(local_path):
                self.stdout.write(f'  [SKIP] {student} - local file not found: {local_path}')
                continue

            try:
                filename = os.path.basename(local_path)
                with open(local_path, 'rb') as f:
                    student.photo.save(filename, File(f), save=True)
                self.stdout.write(f'  [OK] {student} - uploaded to Cloudinary')
                success += 1
            except Exception as e:
                self.stdout.write(f'  [ERROR] {student} - {e}')

        self.stdout.write(f'\nDone. {success}/{total} photos migrated.')
