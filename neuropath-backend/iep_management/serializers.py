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
    
    
# =====================================================================
# SDD COMPONENT: IEPListDetailSerializer
# Description: Formats database rows for the frontend workspace. Pulls
#              relational student data and formats timestamps.
# =====================================================================
class IEPListDetailSerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source='studentID.name', read_only=True)
    formattedDate = serializers.DateTimeField(source='createdDate', format="%B %d, %Y", read_only=True)

    class Meta:
        model = IEPModel
        fields = ['iepID', 'studentID', 'studentName', 'baselineData', 'goals', 'accommodations', 'version', 'formattedDate']


# =====================================================================
# SDD COMPONENT: IEPUpdateSerializer
# Description: Strict validation for teacher edits. Only permits changes
#              to specific text blocks to prevent accidental data corruption.
# =====================================================================
class IEPUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IEPModel
        # Teachers can only edit the text content, not the core student IDs or timestamps
        fields = ['baselineData', 'goals', 'accommodations']
        
    def validate_goals(self, value):
        if not value or len(value.strip()) < 15:
            raise serializers.ValidationError("Goals cannot be left blank. Minimum length required.")
        return value