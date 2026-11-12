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
        student_id = getattr(instance, 'pk', None) or getattr(instance, 'studentID', None)
        id_suffix = f" #{student_id}" if student_id else ""
        if not raw_name or raw_name.startswith('gAAAAA') or raw_name.startswith('[Encrypted'):
            data['name'] = pd.get('studentName') or pd.get('learnerName') or f"[Encrypted Student{id_suffix}]"
        raw_dis = data.get('primaryDisability') or ''
        if not raw_dis or raw_dis.startswith('gAAAAA') or raw_dis.startswith('[Encrypted'):
            data['primaryDisability'] = pd.get('disabilityCategory') or pd.get('diagnosisDetails') or (raw_dis if not raw_dis.startswith('gAAAAA') and not raw_dis.startswith('[Encrypted') else '[Encrypted Disability]')
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


# =====================================================================
# SDD COMPONENT: ScheduleEventSerializer
# Description: Serializer for IEP schedule milestones, deadline tracking,
#              and custom teacher-scheduled educational calendar events.
# =====================================================================
from django.utils import timezone
from .models import ScheduleEvent


class ScheduleEventSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_grade = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    iep_version = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    timeline_mins_session = serializers.SerializerMethodField()

    class Meta:
        model = ScheduleEvent
        fields = [
            'eventID',
            'teacher',
            'student',
            'student_id',
            'student_name',
            'student_grade',
            'iep',
            'iep_version',
            'title',
            'event_type',
            'due_date',
            'due_time',
            'status',
            'priority',
            'notes',
            'timeline_mins_session',
            'is_overdue',
            'days_remaining',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['eventID', 'teacher', 'completed_at', 'created_at', 'updated_at']

    def get_student_name(self, obj):
        if not obj.student:
            return ""
        raw_name = obj.student.name or ""
        pd = obj.student.profileDetails if isinstance(obj.student.profileDetails, dict) else {}
        student_id = getattr(obj.student, 'pk', None) or getattr(obj.student, 'studentID', None)
        id_suffix = f" #{student_id}" if student_id else ""
        if not raw_name or raw_name.startswith('gAAAAA') or raw_name.startswith('[Encrypted'):
            return pd.get('studentName') or pd.get('learnerName') or f"[Encrypted Student{id_suffix}]"
        return raw_name

    def get_student_grade(self, obj):
        return obj.student.grade if obj.student else None

    def get_student_id(self, obj):
        return obj.student.studentID if obj.student else None

    def get_iep_version(self, obj):
        return obj.iep.version if obj.iep else None

    def get_is_overdue(self, obj):
        if obj.status == 'completed' or obj.status == 'dismissed':
            return False
        return bool(obj.due_date and obj.due_date < timezone.now().date())

    def get_days_remaining(self, obj):
        if not obj.due_date:
            return 0
        return (obj.due_date - timezone.now().date()).days

    def get_timeline_mins_session(self, obj):
        if not obj.iep:
            return ""
        try:
            # Gather timeline/session dosage from objective rows
            for goal in obj.iep.individual_goals.prefetch_related('objective_rows').all():
                for row in goal.objective_rows.all():
                    if row.timeline_mins_session and row.timeline_mins_session.strip():
                        return row.timeline_mins_session.strip()
        except Exception:
            pass
        return ""
