from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from .models import StudentProfile, Teacher


def get_default_teacher():
    """Return a safe default teacher for local MVP/demo usage.

    The current frontend does not send a teacher id when creating a student
    profile, but the ERD requires every StudentProfile to have a Teacher.
    This keeps the backend connected without forcing the UI to expose that field.
    """
    teacher, _ = Teacher.objects.get_or_create(
        email='default.teacher@neuropath.local',
        defaults={
            'name': 'Default Teacher',
            'passwordHash': 'not-used-for-demo',
        },
    )
    return teacher


class StudentProfileSerializer(serializers.ModelSerializer):
    # The owning teacher is always derived server-side from the authenticated
    # request user (see create() below) — never accepted from the client, so
    # one teacher cannot assign/reassign a student to another teacher.
    teacher = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = StudentProfile
        fields = '__all__'
        extra_kwargs = {
            'name': {'required': False, 'allow_blank': True},
            'age': {'required': False},
            'grade': {'required': False},
            'gender': {'required': False, 'allow_blank': True},
            'asdBackground': {'required': False, 'allow_blank': True},
            'preferences': {'required': False, 'allow_blank': True},
            'assessmentResult': {'required': False, 'allow_blank': True},
            'diagnosis': {'required': False, 'allow_blank': True},
            'support_needs': {'required': False, 'allow_blank': True},
            'learning_style': {'required': False, 'allow_blank': True},
            'interests': {'required': False, 'allow_blank': True},
            'sensory_preferences': {'required': False, 'allow_blank': True},
            'profileDetails': {'required': False},
        }

    def validate(self, data):
        profile_details = data.get('profileDetails') or {}
        if profile_details:
            required_profile_fields = {
                'presentEvaluation': 'Evaluation / assessment results are required before saving the student profile.',
                'academicStrengths': 'Academic, developmental, and/or functional strengths are required before saving the student profile.',
                'academicNeeds': 'Academic, developmental, and/or functional needs are required before saving the student profile.',
                'parentalConcerns': 'Parental concerns are required before saving the student profile.',
                'curriculumImpact': 'Curriculum impact is required before saving the student profile.',
            }

            errors = {}
            for field, message in required_profile_fields.items():
                if not str(profile_details.get(field, '')).strip():
                    errors[field] = message

            if errors:
                raise serializers.ValidationError(errors)

        # RA 10173 (Data Privacy Act of 2012) Minor Consent Validation
        consent_obtained = data.get('parental_consent_obtained')
        if consent_obtained:
            guardian_name = (data.get('guardian_name') or '').strip()
            consent_date = data.get('consent_date')
            consent_errors = {}
            if not guardian_name:
                consent_errors['guardian_name'] = 'Parent or legal guardian name is required when consent is marked as obtained.'
            if not consent_date:
                consent_errors['consent_date'] = 'Consent verification date is required when consent is marked as obtained.'
            if consent_errors:
                raise serializers.ValidationError(consent_errors)

        return data

    def validate_age(self, value):
        if value is None:
            return 0
        if value < 0 or value > 100:
            raise serializers.ValidationError('Age must be a valid number for a student.')
        return value

    def validate_grade(self, value):
        if value is None:
            return 0
        if value < 0 or value > 12:
            raise serializers.ValidationError('Grade must be between K (0) and 12.')
        return value

    def create(self, validated_data):
        from .utils import get_teacher_for_user

        request = self.context.get('request')
        teacher = get_teacher_for_user(request.user) if request else None

        # Last resort: fall back to the demo teacher so the record still saves.
        validated_data['teacher'] = teacher or get_default_teacher()

        return super().create(validated_data)


class ValidationService(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = '__all__'
        extra_kwargs = {
            'name': {'required': False, 'allow_blank': True},
            'gender': {'required': False, 'allow_blank': True},
            'asdBackground': {'required': False, 'allow_blank': True},
            'preferences': {'required': False, 'allow_blank': True},
            'assessmentResult': {'required': False, 'allow_blank': True},
            'diagnosis': {'required': False, 'allow_blank': True},
            'support_needs': {'required': False, 'allow_blank': True},
            'learning_style': {'required': False, 'allow_blank': True},
            'interests': {'required': False, 'allow_blank': True},
            'sensory_preferences': {'required': False, 'allow_blank': True},
            'profileDetails': {'required': False},
        }

    def validate(self, data):
        if 'age' in data and 'grade' in data:
            if data.get('age', 0) < 4 and data.get('grade', 0) > 0:
                raise serializers.ValidationError('A student under 4 years old cannot be in a grade higher than Kindergarten.')
        return data


class TeacherSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']
        extra_kwargs = {
            'password': {'write_only': True, 'required': True},
            'username': {'required': False},
        }

    def validate_email(self, value):
        email = value.strip().lower()
        if not email:
            raise serializers.ValidationError('This field may not be blank.')
        if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists() or Teacher.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data['email'].strip().lower()
        validated_data['email'] = email
        if not validated_data.get('username'):
            validated_data['username'] = email

        user = User.objects.create_user(**validated_data)
        first = validated_data.get('first_name', '')
        last = validated_data.get('last_name', '')
        full_name = f'{first} {last}'.strip() if first or last else user.username

        Teacher.objects.create(
            email=email,
            name=full_name,
            passwordHash=user.password,
        )
        return user