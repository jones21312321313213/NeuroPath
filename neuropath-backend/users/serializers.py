from rest_framework import serializers
from .models import StudentProfile

class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = '__all__'

    # ProfileValidationService: Custom data validation
    def validate_age(self, value):
        if value < 2 or value > 100:
            raise serializers.ValidationError("Age must be a valid number for a student.")
        return value

    def validate_grade(self, value):
        if value < 0 or value > 12:
            raise serializers.ValidationError("Grade must be between K (0) and 12.")
        return value