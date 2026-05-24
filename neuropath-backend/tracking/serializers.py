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
        fields = ['progressID', 'subjectName', 'performanceScore', 'trackingInterval']