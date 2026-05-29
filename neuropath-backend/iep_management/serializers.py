from rest_framework import serializers
from .models import IEPModel, IEPGoal, IEPObjectiveRow

class IEPDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = IEPModel
        fields = [
            'iepID',
            'studentID',
            'accommodations',
            'generatedDetails',
            'version',
            'createdDate',
            'program_type',
            'difficulties',
            'learning_barriers',
            'barrier_qualifiers',
            'learning_facilitators',
            'facilitator_qualifiers',
            'learning_accommodations'
        ]
        extra_kwargs = {
            'baselineData': {'required': False, 'allow_blank': True},
            'goals': {'required': False, 'allow_blank': True},
            'accommodations': {'required': False, 'allow_blank': True},
            'generatedDetails': {'required': False},
        }


class IEPListDetailSerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source='studentID.name', read_only=True)
    formattedDate = serializers.DateTimeField(source='createdDate', format='%B %d, %Y', read_only=True)

    class Meta:
        model = IEPModel
        fields = [
            'iepID',
            'studentID',
            'studentName',
            'baselineData',
            'goals',
            'accommodations',
            'generatedDetails',
            'version',
            'formattedDate',
            # 🎯 ADDED NEW SECTION B FIELDS HERE so the GET request displays them
            'program_type',
            'difficulties',
            'learning_barriers',
            'barrier_qualifiers',
            'learning_facilitators',
            'facilitator_qualifiers',
            'learning_accommodations'
        ]


class IEPUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IEPModel
        fields = [
            'baselineData', 'goals', 'accommodations', 'generatedDetails',
            # 🎯 ADDED NEW SECTION B FIELDS HERE so PUT/PATCH edits work
            'program_type', 'difficulties', 'learning_barriers', 
            'barrier_qualifiers', 'learning_facilitators', 'facilitator_qualifiers',
            'learning_accommodations'
        ]
        extra_kwargs = {
            'baselineData': {'required': False, 'allow_blank': True},
            'goals': {'required': False, 'allow_blank': True},
            'accommodations': {'required': False, 'allow_blank': True},
            'generatedDetails': {'required': False},
        }

class StandaloneIEPGoalSerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source='iep.studentID.name', read_only=True)
    studentID = serializers.IntegerField(source='iep.studentID.pk', read_only=True)

    class Meta:
        model = IEPGoal
        fields = [
            'goalID',
            'iep',
            'studentID',
            'studentName',
            'subject_category',
            'annual_goal',
            'enroute_objectives',
            'interventions_procedures',
            'timeline_mins_session',
            'individuals_responsible',
            'progress_instructional',
            'remarks'
        ]
        
        
class IEPObjectiveRowSerializer(serializers.ModelSerializer):
    class Meta:
        model = IEPObjectiveRow
        fields = [
            'rowID', 'enroute_objectives', 'interventions_procedures', 
            'timeline_mins_session', 'individuals_responsible', 
            'progress_instructional', 'remarks'
        ]

class StandaloneIEPGoalSerializer(serializers.ModelSerializer):
    studentName = serializers.CharField(source='iep.studentID.name', read_only=True)
    studentID = serializers.IntegerField(source='iep.studentID.pk', read_only=True)
    
    # 🚀 NESTED LIST: Serializer automatically manages the grid relation
    objective_rows = IEPObjectiveRowSerializer(many=True, required=False)

    class Meta:
        model = IEPGoal
        fields = [
            'goalID', 'iep', 'studentID', 'studentName', 'goalName', 
            'target_metric', 'subject_category', 'annual_goal', 'objective_rows'
        ]

    def create(self, validated_data):
        # Extract the rows list out of the inbound data payload
        rows_data = validated_data.pop('objective_rows', [])
        
        # 1. Create the parent header record
        parent_goal = IEPGoal.objects.create(**validated_data)
        
        # 2. Spin up the child rows database assignments
        for row in rows_data:
            IEPObjectiveRow.objects.create(parent_goal=parent_goal, **row)
            
        return parent_goal

    def update(self, instance, validated_data):
        rows_data = validated_data.pop('objective_rows', None)
        
        # Update the parent goal details
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If a grid update array is passed, clear old rows and re-populate
        if rows_data is not None:
            instance.objective_rows.all().delete()
            for row in rows_data:
                IEPObjectiveRow.objects.create(parent_goal=instance, **row)

        return instance
    
    

class IEPGenerationRequestSerializer(serializers.Serializer):
    student_name = serializers.CharField(max_length=100)
    diagnosis = serializers.CharField(max_length=100)
    baseline_barriers = serializers.CharField()
    target_domain = serializers.CharField(max_length=100)

    def validate_baseline_barriers(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Baseline barriers must be detailed.")
        return value