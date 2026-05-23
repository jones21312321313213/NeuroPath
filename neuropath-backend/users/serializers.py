from rest_framework import serializers
from django.contrib.auth.models import User
from .models import StudentProfile

class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = '__all__'

    def validate_age(self, value):
        if value < 2 or value > 100:
            raise serializers.ValidationError("Age must be a valid number for a student.")
        return value

    def validate_grade(self, value):
        if value < 0 or value > 12:
            raise serializers.ValidationError("Grade must be between K (0) and 12.")
        return value
    

# =====================================================================
# SDD COMPONENT: ValidationService
# Description: Re-verifies incoming data sets to guarantee backend consistency.
# =====================================================================
class ValidationService(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = '__all__'

    def validate_assessmentResult(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Updated assessment results must include detailed notes.")
        return value

    def validate(self, data):
        if 'age' in data and 'grade' in data:
            if data['age'] < 4 and data['grade'] > 0:
                raise serializers.ValidationError("A student under 4 years old cannot be in a grade higher than Kindergarten.")
        return data
    
# =====================================================================
# SDD COMPONENT: TeacherValidationService
# Description: Validates payload schemas for teacher account registration.
# =====================================================================
class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        # Note: Replace with your custom Teacher model if you aren't using the default User model
        model = User 
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Securely hashes the password before storing it in PostgreSQL
        user = User.objects.create_user(**validated_data)
        return user