from rest_framework import serializers
from .models import IEPModel


class IEPDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = IEPModel
        fields = [
            'iepID',
            'studentID',
            'baselineData',
            'goals',
            'accommodations',
            'generatedDetails',
            'version',
            'createdDate',
        ]
        read_only_fields = ['iepID', 'version', 'createdDate']
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
        ]


class IEPUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = IEPModel
        fields = ['baselineData', 'goals', 'accommodations', 'generatedDetails']
        extra_kwargs = {
            'baselineData': {'required': False, 'allow_blank': True},
            'goals': {'required': False, 'allow_blank': True},
            'accommodations': {'required': False, 'allow_blank': True},
            'generatedDetails': {'required': False},
        }
