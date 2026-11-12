from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework.authtoken.models import Token

from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, IEPGoal, IEPObjectiveRow
from tracking.models import (
    ScheduleEvent,
    ScheduleEventType,
    ScheduleEventPriority,
    ScheduleEventStatus,
)
from tracking.scheduling_service import create_iep_milestone_events


class ScheduleEventTests(APITestCase):
    def setUp(self):
        # Teacher 1 and User 1
        self.user1 = User.objects.create_user(
            username='teacher1',
            email='teacher1@example.com',
            password='password123',
            first_name='Maria',
            last_name='Santos'
        )
        self.teacher1 = Teacher.objects.create(
            name='Teacher Maria',
            email='teacher1@example.com',
            passwordHash='hash123'
        )
        self.token1 = Token.objects.create(user=self.user1)

        # Teacher 2 and User 2 (for isolation testing)
        self.user2 = User.objects.create_user(
            username='teacher2',
            email='teacher2@example.com',
            password='password123'
        )
        self.teacher2 = Teacher.objects.create(
            name='Teacher Pedro',
            email='teacher2@example.com',
            passwordHash='hash456'
        )
        self.token2 = Token.objects.create(user=self.user2)

        # Student for Teacher 1
        self.student1 = StudentProfile.objects.create(
            teacher=self.teacher1,
            name='Juan Dela Cruz',
            age=8,
            grade=2,
        )

        # IEP for Student 1
        self.iep1 = IEPModel.objects.create(
            studentID=self.student1,
            version=1,
            difficulties='Mathematics, Fine Motor',
            createdDate=timezone.now(),
        )

        # Goal and Objective Rows for IEP 1
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1,
            goalName='Number Recognition',
            subject_category='Mathematics',
            target_metric='80% accuracy',
        )
        self.row1 = IEPObjectiveRow.objects.create(
            parent_goal=self.goal1,
            enroute_objectives='Count 1 to 5',
            month_1_target='Identify numbers 1-5 with flashcards',
            month_2_target='Order numbers 1-10 sequentially',
            month_3_target='Identify quantities up to 10 with 80% accuracy',
            timeline_mins_session='10 minutes, 5 times per week',
        )

    def test_auto_schedule_creates_four_milestone_events(self):
        """Auto-scheduling creates Day 30, Day 60, Day 90, and Day 365 milestone events."""
        events = create_iep_milestone_events(self.iep1, self.teacher1)
        self.assertEqual(len(events), 4)

        event_types = [e.event_type for e in events]
        self.assertIn(ScheduleEventType.MONTH_1_MILESTONE, event_types)
        self.assertIn(ScheduleEventType.MONTH_2_MILESTONE, event_types)
        self.assertIn(ScheduleEventType.QUARTERLY_REVIEW, event_types)
        self.assertIn(ScheduleEventType.ANNUAL_RENEWAL, event_types)

        base_date = self.iep1.createdDate.date()
        m1 = next(e for e in events if e.event_type == ScheduleEventType.MONTH_1_MILESTONE)
        self.assertEqual(m1.due_date, base_date + timedelta(days=30))
        self.assertIn("Identify numbers 1-5", m1.notes)

        q_review = next(e for e in events if e.event_type == ScheduleEventType.QUARTERLY_REVIEW)
        self.assertEqual(q_review.due_date, base_date + timedelta(days=90))
        self.assertEqual(q_review.priority, ScheduleEventPriority.HIGH)

        annual = next(e for e in events if e.event_type == ScheduleEventType.ANNUAL_RENEWAL)
        self.assertEqual(annual.due_date, base_date + timedelta(days=365))
        self.assertEqual(annual.priority, ScheduleEventPriority.URGENT)

    def test_supersede_stale_milestones_on_new_iep_version(self):
        """When IEP v2 is created, previous pending milestone events from v1 are dismissed."""
        # Create initial milestone events for v1
        v1_events = create_iep_milestone_events(self.iep1, self.teacher1)
        self.assertEqual(ScheduleEvent.objects.filter(student=self.student1, status=ScheduleEventStatus.PENDING).count(), 4)

        # Create IEP v2
        iep2 = IEPModel.objects.create(
            studentID=self.student1,
            version=2,
            difficulties='Mathematics, Speech Communication',
            createdDate=timezone.now(),
        )
        create_iep_milestone_events(iep2, self.teacher1)

        # Older pending events for v1 should now be dismissed
        v1_pending_count = ScheduleEvent.objects.filter(iep=self.iep1, status=ScheduleEventStatus.DISMISSED).count()
        self.assertEqual(v1_pending_count, 4)

        # Total active pending events for the student should be exactly 4 (belonging to v2)
        v2_pending = ScheduleEvent.objects.filter(student=self.student1, iep=iep2, status=ScheduleEventStatus.PENDING)
        self.assertEqual(v2_pending.count(), 4)

    def test_list_events_api(self):
        """Authenticated teacher can list their schedule events with filtering."""
        create_iep_milestone_events(self.iep1, self.teacher1)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        response = self.client.get('/api/schedule/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)

        first_event = response.data[0]
        self.assertIn('student_name', first_event)
        self.assertEqual(first_event['student_name'], 'Juan Dela Cruz')
        self.assertIn('is_overdue', first_event)
        self.assertIn('days_remaining', first_event)
        self.assertIn('timeline_mins_session', first_event)
        self.assertEqual(first_event['timeline_mins_session'], '10 minutes, 5 times per week')

    def test_upcoming_deadlines_api(self):
        """Upcoming endpoint returns overdue and near-term deadlines."""
        # Create an overdue event
        overdue_event = ScheduleEvent.objects.create(
            teacher=self.teacher1,
            student=self.student1,
            title='Overdue Milestone Check',
            event_type=ScheduleEventType.MONTH_1_MILESTONE,
            due_date=timezone.now().date() - timedelta(days=2),
            status=ScheduleEventStatus.PENDING,
            priority=ScheduleEventPriority.HIGH,
        )
        # Create an event due tomorrow
        due_tomorrow = ScheduleEvent.objects.create(
            teacher=self.teacher1,
            student=self.student1,
            title='Tomorrow Review',
            event_type=ScheduleEventType.QUARTERLY_REVIEW,
            due_date=timezone.now().date() + timedelta(days=1),
            status=ScheduleEventStatus.PENDING,
            priority=ScheduleEventPriority.MEDIUM,
        )
        # Create an event far in the future (beyond 14 days)
        ScheduleEvent.objects.create(
            teacher=self.teacher1,
            student=self.student1,
            title='Future Conference',
            event_type=ScheduleEventType.ANNUAL_RENEWAL,
            due_date=timezone.now().date() + timedelta(days=60),
            status=ScheduleEventStatus.PENDING,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        response = self.client.get('/api/schedule/upcoming/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should only include overdue + tomorrow (within 14 days), excluding the 60-day one
        event_ids = [e['eventID'] for e in response.data]
        self.assertIn(overdue_event.eventID, event_ids)
        self.assertIn(due_tomorrow.eventID, event_ids)
        self.assertEqual(len(response.data), 2)

    def test_create_custom_meeting_event(self):
        """Teacher can manually create a parent conference or assessment event."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        payload = {
            'student': self.student1.studentID,
            'title': 'Parent IEP Consultation',
            'event_type': 'custom_meeting',
            'due_date': str(timezone.now().date() + timedelta(days=5)),
            'priority': 'high',
            'notes': 'Discuss communication visual aids with parents.'
        }
        response = self.client.post('/api/schedule/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Parent IEP Consultation')
        self.assertEqual(response.data['student_name'], 'Juan Dela Cruz')

    def test_complete_and_reopen_event(self):
        """One-click completion sets status='completed' and timestamp, reopen rolls it back."""
        event = ScheduleEvent.objects.create(
            teacher=self.teacher1,
            student=self.student1,
            title='Check-in Task',
            due_date=timezone.now().date(),
            status=ScheduleEventStatus.PENDING,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        # Complete
        comp_res = self.client.post(f'/api/schedule/{event.eventID}/complete/')
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)
        self.assertEqual(comp_res.data['status'], 'completed')
        self.assertIsNotNone(comp_res.data['completed_at'])

        # Reopen
        reopen_res = self.client.post(f'/api/schedule/{event.eventID}/reopen/')
        self.assertEqual(reopen_res.status_code, status.HTTP_200_OK)
        self.assertEqual(reopen_res.data['status'], 'pending')
        self.assertIsNone(reopen_res.data['completed_at'])

    def test_teacher_isolation_security(self):
        """Teacher 2 cannot view or manipulate Teacher 1's events."""
        event = ScheduleEvent.objects.create(
            teacher=self.teacher1,
            student=self.student1,
            title='Teacher 1 Private Schedule',
            due_date=timezone.now().date(),
            status=ScheduleEventStatus.PENDING,
        )

        # Authenticate as Teacher 2
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token2.key}')

        # List should not contain Teacher 1's event
        list_res = self.client.get('/api/schedule/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 0)

        # Direct detail lookup should 404
        detail_res = self.client.get(f'/api/schedule/{event.eventID}/')
        self.assertEqual(detail_res.status_code, status.HTTP_404_NOT_FOUND)

        # Complete action should 404
        complete_res = self.client.post(f'/api/schedule/{event.eventID}/complete/')
        self.assertEqual(complete_res.status_code, status.HTTP_404_NOT_FOUND)
