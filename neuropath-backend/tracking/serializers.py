from rest_framework import serializers
from users.models import StudentProfile
from .models import StudentProgress

# =====================================================================
# SDD COMPONENT: HistoricalRecordDataSerializer
# Description: Validation and data transformation component. Maps raw 
#              database entities into clean, predictable JSON objects.
# =====================================================================
class HistoricalRecordDataSerializer(serializers.ModelSerializer):
    # Bridge the UML naming convention to your actual database columns!
    gradeLevel = serializers.IntegerField(source='grade', read_only=True)
    primaryDisability = serializers.CharField(source='asdBackground', read_only=True)

    class Meta:
        model = StudentProfile
        # Now we can safely use the UML fields because we explicitly mapped them above
        fields = ['studentID', 'name', 'age', 'gradeLevel', 'primaryDisability']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_name = data.get('name') or ''
        pd = instance.profileDetails if isinstance(instance.profileDetails, dict) else {}
        if not raw_name or raw_name.startswith('gAAAAA'):
            data['name'] = pd.get('studentName') or pd.get('learnerName') or raw_name
        raw_dis = data.get('primaryDisability') or ''
        if not raw_dis or raw_dis.startswith('gAAAAA'):
            data['primaryDisability'] = pd.get('disabilityCategory') or pd.get('diagnosisDetails') or raw_dis
        return data
   
# =====================================================================
# SDD COMPONENT: ProgressAnalyticsSerializer
# Description: Data transformation component mapping raw timeline entries 
#              into clean, predictable JSON objects for front-end charts.
# =====================================================================     
class ProgressAnalyticsSerializer(serializers.ModelSerializer):
    # Bridge the database 'dateLogged' to the UML 'trackingInterval' requirement
    # Format the date so it looks clean on the X-axis of a React chart
    trackingInterval = serializers.DateTimeField(source='dateLogged', format="%Y-%m-%d", read_only=True)

    class Meta:
        model = StudentProgress
        fields = ['progressID', 'subjectName', 'performanceScore', 'trackingInterval', 'behavioralObservations', 'dateLogged']