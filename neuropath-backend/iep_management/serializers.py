from rest_framework import serializers
from .models import IEPModel

# =====================================================================
# SDD COMPONENT: IEPDataSerializer
# Description: Strict data validation and parsing component formatting
#              JSON payloads for the React review editor.
# =====================================================================
class IEPDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = IEPModel
        fields = ['iepID', 'studentID', 'baselineData', 'goals', 'accommodations', 'version', 'createdDate']

    def validate_baselineData(self, value):
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Baseline performance data is too brief for accurate AI generation.")
        return value