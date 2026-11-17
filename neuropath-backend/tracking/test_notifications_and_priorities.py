import json
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from rest_framework import status

from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel
from iep_management.views import GenerateIEPGoalsFromIEPView
from .models import (
    ScheduleEvent,
    ScheduleEventType,
    ScheduleEventPriority,
    Notification,
    NotificationTriggerType,
)
from .scheduling_service import (
    create_iep_milestone_events,
    is_event_within_notification_window,
)


class NotificationAndMilestonePriorityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.user1 = User.objects.create_user(
            username='teacher1@test.com',
            email='teacher1@test.com',
            password='password123',
            first_name='Ana',
            last_name='Santos',
        )
        self.teacher1 = Teacher.objects.create(
            name='Teacher Ana',
            email='teacher1@test.com',
            passwordHash='hash123',
        )
        self.token1 = Token.objects.create(user=self.user1)

        self.user2 = User.objects.create_user(
            username='teacher2@test.com',
            email='teacher2@test.com',
            password='password123',
            first_name='Pedro',
            last_name='Reyes',
        )
        self.teacher2 = Teacher.objects.create(
            name='Teacher Pedro',
            email='teacher2@test.com',
            passwordHash='hash456',
        )
        self.token2 = Token.objects.create(user=self.user2)

        self.student1 = StudentProfile.objects.create(
            teacher=self.teacher1,
            name='Juan Dela Cruz',
            age=8,
            grade=2,
            asdBackground='Autism Spectrum Disorder',
            parental_consent_obtained=True,
        )

        self.iep1 = IEPModel.objects.create(
            studentID=self.student1,
            version=1,
            difficulties='Communication',
            createdDate=timezone.now(),
        )

    def test_priority_lead_time_notification_windows(self):
        """Low=1d, Medium=2d, High=3d advance notice + day-of event + overdue."""
        today = timezone.now().date()

        low_ok = ScheduleEvent(due_date=today + timedelta(days=1), priority=ScheduleEventPriority.LOW)
        low_too_early = ScheduleEvent(due_date=today + timedelta(days=2), priority=ScheduleEventPriority.LOW)
        low_today = ScheduleEvent(due_date=today, priority=ScheduleEventPriority.LOW)

        med_ok = ScheduleEvent(due_date=today + timedelta(days=2), priority=ScheduleEventPriority.MEDIUM)
        med_too_early = ScheduleEvent(due_date=today + timedelta(days=3), priority=ScheduleEventPriority.MEDIUM)

        high_ok = ScheduleEvent(due_date=today + timedelta(days=3), priority=ScheduleEventPriority.HIGH)
        high_too_early = ScheduleEvent(due_date=today + timedelta(days=4), priority=ScheduleEventPriority.HIGH)

        overdue_low = ScheduleEvent(due_date=today - timedelta(days=1), priority=ScheduleEventPriority.LOW)

        self.assertTrue(is_event_within_notification_window(low_ok, today))
        self.assertFalse(is_event_within_notification_window(low_too_early, today))
        self.assertTrue(is_event_within_notification_window(low_today, today))

        self.assertTrue(is_event_within_notification_window(med_ok, today))
        self.assertFalse(is_event_within_notification_window(med_too_early, today))

        self.assertTrue(is_event_within_notification_window(high_ok, today))
        self.assertFalse(is_event_within_notification_window(high_too_early, today))

        self.assertTrue(is_event_within_notification_window(overdue_low, today))

    def test_upcoming_priority_window_filter_and_sync(self):
        """upcoming?priority_window=true enforces 1d/2d/3d lead windows and records Notifications."""
        today = timezone.now().date()

        ev_low_2d = ScheduleEvent.objects.create(
            teacher=self.teacher1, student=self.student1,
            title='Low 2d away (too early)', due_date=today + timedelta(days=2), priority=ScheduleEventPriority.LOW,
        )
        ev_low_1d = ScheduleEvent.objects.create(
            teacher=self.teacher1, student=self.student1,
            title='Low 1d away (triggers)', due_date=today + timedelta(days=1), priority=ScheduleEventPriority.LOW,
        )
        ev_med_2d = ScheduleEvent.objects.create(
            teacher=self.teacher1, student=self.student1,
            title='Medium 2d away (triggers)', due_date=today + timedelta(days=2), priority=ScheduleEventPriority.MEDIUM,
        )
        ev_high_3d = ScheduleEvent.objects.create(
            teacher=self.teacher1, student=self.student1,
            title='High 3d away (triggers)', due_date=today + timedelta(days=3), priority=ScheduleEventPriority.HIGH,
        )
        ev_today = ScheduleEvent.objects.create(
            teacher=self.teacher1, student=self.student1,
            title='Due Today Low', due_date=today, priority=ScheduleEventPriority.LOW,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        res = self.client.get('/api/schedule/upcoming/?priority_window=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        returned_ids = {item['eventID'] for item in res.data}
        self.assertNotIn(ev_low_2d.eventID, returned_ids)
        self.assertIn(ev_low_1d.eventID, returned_ids)
        self.assertIn(ev_med_2d.eventID, returned_ids)
        self.assertIn(ev_high_3d.eventID, returned_ids)
        self.assertIn(ev_today.eventID, returned_ids)

        # Persistent Notification records created cleanly (including advance_notice vs due_today)
        notifs = Notification.objects.filter(teacher=self.teacher1)
        self.assertEqual(notifs.count(), 4)
        due_today_notif = notifs.get(schedule_event=ev_today)
        self.assertEqual(due_today_notif.trigger_type, NotificationTriggerType.DUE_TODAY)

    def test_notifications_pagination_10_per_page_and_isolation(self):
        """GET /api/notifications/ returns 10 items per page, filters, marks read, and isolates teachers."""
        today = timezone.now().date()
        for i in range(15):
            Notification.objects.create(
                teacher=self.teacher1,
                student=self.student1,
                title=f'Notification #{i + 1}',
                message=f'Alert detail {i + 1}',
                priority=ScheduleEventPriority.HIGH if i < 3 else ScheduleEventPriority.MEDIUM,
                trigger_type=NotificationTriggerType.ADVANCE_NOTICE,
                due_date=today + timedelta(days=2),
                is_read=(i % 2 == 0),
            )

        # Other teacher notification should remain hidden
        Notification.objects.create(
            teacher=self.teacher2,
            title='Other Teacher Private Alert',
            priority=ScheduleEventPriority.HIGH,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        p1 = self.client.get('/api/notifications/?page=1')
        self.assertEqual(p1.status_code, status.HTTP_200_OK)
        self.assertEqual(p1.data['count'], 15)
        self.assertEqual(p1.data['page_size'], 10)
        self.assertEqual(p1.data['total_pages'], 2)
        self.assertEqual(len(p1.data['results']), 10)
        self.assertEqual(p1.data['unread_count'], 7)  # 1,3,5,7,9,11,13

        p2 = self.client.get('/api/notifications/?page=2')
        self.assertEqual(p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(p2.data['results']), 5)

        # Filter by high priority
        high_res = self.client.get('/api/notifications/?priority=high')
        self.assertEqual(high_res.data['count'], 3)

        # Mark single notification read
        first_unread = Notification.objects.filter(teacher=self.teacher1, is_read=False).first()
        mr_res = self.client.post(f'/api/notifications/{first_unread.notificationID}/mark-read/')
        self.assertEqual(mr_res.status_code, status.HTTP_200_OK)
        first_unread.refresh_from_db()
        self.assertTrue(first_unread.is_read)

        # Mark all read
        mar_res = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(mar_res.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(teacher=self.teacher1, is_read=False).count(), 0)

    def test_goal_priority_creation_and_schedule_sync(self):
        """Goal objective row monthly priorities propagate and sync to ScheduleEvent milestones."""
        create_iep_milestone_events(self.iep1, self.teacher1)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        goal_payload = {
            'iep': self.iep1.iepID,
            'goalName': 'Communication Goal',
            'subject_category': 'COMMUNICATION SKILLS',
            'target_metric': '80% accuracy',
            'objective_rows': [
                {
                    'enroute_objectives': 'Use PECS cards',
                    'month_1_target': 'Point with prompts',
                    'month_2_target': 'Point with verbal cue',
                    'month_3_target': 'Point independently',
                    'month_1_priority': 'high',
                    'month_2_priority': 'low',
                    'month_3_priority': 'medium',
                }
            ],
        }
        res = self.client.post('/api/iep/goals/', goal_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        goal_id = res.data['goalID']

        m1_ev = ScheduleEvent.objects.get(iep=self.iep1, event_type=ScheduleEventType.MONTH_1_MILESTONE)
        m2_ev = ScheduleEvent.objects.get(iep=self.iep1, event_type=ScheduleEventType.MONTH_2_MILESTONE)
        m3_ev = ScheduleEvent.objects.get(iep=self.iep1, event_type=ScheduleEventType.QUARTERLY_REVIEW)

        self.assertEqual(m1_ev.priority, ScheduleEventPriority.HIGH)
        self.assertEqual(m2_ev.priority, ScheduleEventPriority.LOW)
        self.assertEqual(m3_ev.priority, ScheduleEventPriority.MEDIUM)

        # Teacher readjusts Month 2 priority from low -> high
        goal_payload['objective_rows'][0]['month_2_priority'] = 'high'
        upd = self.client.put(f'/api/iep/goals/{goal_id}/', goal_payload, format='json')
        self.assertEqual(upd.status_code, status.HTTP_200_OK)

        m2_ev.refresh_from_db()
        self.assertEqual(m2_ev.priority, ScheduleEventPriority.HIGH)

    @patch('iep_management.views.AIEngineService.generate_text')
    def test_ai_generates_milestone_priorities(self, mock_gen):
        """AI generation parses month_1_priority, month_2_priority, and month_3_priority."""
        mock_gen.return_value = (
            json.dumps([
                {
                    'enroute_objectives': 'Count 1-5',
                    'month_1_target': 'Count 1-2 with prompts',
                    'month_2_target': 'Count 1-4 with cues',
                    'month_3_target': 'Count 1-5 independently',
                    'month_1_priority': 'high',
                    'month_2_priority': 'med',
                    'month_3_priority': 'low',
                    'interventions_procedures': 'Visual counters',
                    'timeline_mins_session': '15 mins/day',
                    'individuals_responsible': 'SNED Teacher',
                    'progress_instructional': 'Checklist',
                    'remarks': 'Foundational',
                }
            ]),
            'gemini',
        )
        view = GenerateIEPGoalsFromIEPView()
        rows = view._generate_objective_rows('Alex', 'Counting', 'Counters', 'Count to 5', 'Teacher')
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['month_1_priority'], 'high')
        self.assertEqual(rows[0]['month_2_priority'], 'medium')
        self.assertEqual(rows[0]['month_3_priority'], 'low')
