import json
from django.test import TestCase
from django.urls import resolve
from rest_framework.test import APIClient
from rest_framework import status

from common_test_utils import create_teacher_with_login, create_student
from iep_management.models import IEPModel, IEPGoal
from resources.urls import urlpatterns
from .models import LessonPlan, VisualAid, TeachingStrategy


class ResourceUrlRoutingTestCase(TestCase):
    def test_no_duplicate_router_include(self):
        router_includes = [
            p for p in urlpatterns
            if hasattr(p, 'url_patterns') and any(
                'lesson-plans' in getattr(pattern, 'pattern', '').regex.pattern
                for pattern in getattr(p, 'url_patterns', [])
                if hasattr(getattr(pattern, 'pattern', None), 'regex')
            )
        ]
        # Must only include router.urls once
        self.assertEqual(len(router_includes), 1)

    def test_resource_url_resolutions(self):
        match_lesson = resolve('/api/resources/generate-lesson/')
        self.assertEqual(match_lesson.view_name, 'generate-lesson-plan')

        match_visual = resolve('/api/resources/generate-visual-aid/')
        self.assertEqual(match_visual.view_name, 'generate-visual-aid')

        match_strategy = resolve('/api/resources/generate-strategy/')
        self.assertEqual(match_strategy.view_name, 'generate-teaching-strategy')


class ResourcesAuthAndTenantIsolationTests(TestCase):
    """No resources/lesson-plan/visual-aid/teaching-strategy endpoint should be
    reachable without authentication, and a teacher must never be able to
    read or modify another teacher's resources."""

    def setUp(self):
        self.client = APIClient()

        self.user1, self.teacher1, self.token1 = create_teacher_with_login('owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('other@example.com')

        self.student1 = create_student(self.teacher1, name='Owner Student')
        self.iep1 = IEPModel.objects.create(studentID=self.student1)
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1, goalName='Goal 1', target_metric='Metric', annual_goal='Annual goal text',
        )

        self.lesson_plan = LessonPlan.objects.create(
            iep_goal=self.goal1, title='Owner Lesson', lessonContent='content', status='Draft',
        )
        self.visual_aid = VisualAid.objects.create(
            iep_goal=self.goal1, title='Owner Visual Aid', imageUrl='https://example.com/image.png',
        )
        self.teaching_strategy = TeachingStrategy.objects.create(
            iep_goal=self.goal1, title='Owner Strategy', strategyContent='Detailed strategy content here.',
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    # ---- Unauthenticated access must be rejected ----

    def test_unauthenticated_lesson_plan_list_rejected(self):
        response = self.client.get('/api/resources/lesson-plans/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_visual_aid_list_rejected(self):
        response = self.client.get('/api/resources/visual-aids/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_teaching_strategy_list_rejected(self):
        response = self.client.get('/api/resources/teaching-strategies/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_instructional_dashboard_rejected(self):
        response = self.client.get('/api/resources/instructional-support/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_lesson_plan_delete_rejected(self):
        response = self.client.delete(f'/api/resources/delete-lesson/{self.lesson_plan.pk}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Cross-teacher access must be rejected ----

    def test_cross_teacher_cannot_retrieve_lesson_plan(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/resources/lesson-plans/{self.lesson_plan.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_lesson_plan_list_is_empty(self):
        self._auth(self.token2)
        response = self.client.get('/api/resources/lesson-plans/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['lessonID'] for row in response.data]
        self.assertNotIn(self.lesson_plan.pk, ids)

    def test_cross_teacher_cannot_delete_lesson_plan(self):
        self._auth(self.token2)
        response = self.client.delete(f'/api/resources/delete-lesson/{self.lesson_plan.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(LessonPlan.objects.filter(pk=self.lesson_plan.pk).exists())

    def test_cross_teacher_cannot_edit_lesson_plan(self):
        self._auth(self.token2)
        response = self.client.put(
            f'/api/resources/edit-lesson/{self.lesson_plan.pk}/', {'title': 'Hijacked'}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.lesson_plan.refresh_from_db()
        self.assertEqual(self.lesson_plan.title, 'Owner Lesson')

    def test_cross_teacher_cannot_export_visual_aid(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/resources/export-visual-aid/{self.visual_aid.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_cannot_view_strategy_details(self):
        self._auth(self.token2)
        response = self.client.get(f'/api/resources/query-strategies/{self.teaching_strategy.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cross_teacher_cannot_delete_strategy(self):
        self._auth(self.token2)
        response = self.client.delete(f'/api/resources/delete-strategy/{self.teaching_strategy.pk}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(TeachingStrategy.objects.filter(pk=self.teaching_strategy.pk).exists())

    def test_cross_teacher_cannot_create_visual_aid_on_foreign_goal(self):
        self._auth(self.token2)
        response = self.client.post('/api/resources/visual-aids/', {
            'iep_goal': self.goal1.pk,
            'title': 'Injected Visual Aid',
            'imageUrl': 'https://example.com/hack.png',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ---- Owning teacher retains access ----

    def test_owner_can_retrieve_own_lesson_plan(self):
        self._auth(self.token1)
        response = self.client.get(f'/api/resources/lesson-plans/{self.lesson_plan.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_owner_dashboard_uses_authenticated_identity_not_bypass_email(self):
        # Regression test for the removed "DEVELOPMENT BYPASS" fallback:
        # the dashboard must resolve the Teacher via the authenticated user's
        # own email, not a hardcoded test@gmail.com fallback.
        self._auth(self.token1)
        response = self.client.get('/api/resources/instructional-support/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['userContext']['email'], self.teacher1.email)


class TeachingStrategyCreateTests(TestCase):
    """Regression tests for TeachingStrategyViewSet.create endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user1, self.teacher1, self.token1 = create_teacher_with_login('strat_owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('strat_other@example.com')

        self.student1 = create_student(
            self.teacher1,
            name='Student One',
            learning_style='Visual',
            interests='Dinosaurs',
            sensory_preferences='Low noise'
        )
        self.iep1 = IEPModel.objects.create(studentID=self.student1)
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1,
            goalName='Math Goal',
            target_metric='Count to 20',
            annual_goal='Master basic counting'
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_create_teaching_strategy_with_blank_content_generates_strategy(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': self.goal1.pk,
            'title': 'Visual Counting Strategy',
            'strategyContent': ''
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        self.assertTrue(len(response.data['data']['strategyContent']) > 0)
        self.assertIn('Visual', response.data['data']['strategyContent'])
        self.assertTrue(
            TeachingStrategy.objects.filter(
                iep_goal=self.goal1,
                title='Visual Counting Strategy'
            ).exists()
        )

    def test_create_teaching_strategy_with_explicit_content(self):
        self._auth(self.token1)
        custom_content = "This is custom actionable strategy content that exceeds ten characters."
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': self.goal1.pk,
            'title': 'Custom Strategy',
            'strategyContent': custom_content
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['strategyContent'], custom_content)

    def test_create_teaching_strategy_with_foreign_goal_rejected(self):
        self._auth(self.token2)
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': self.goal1.pk,
            'title': 'Hijack Strategy',
            'strategyContent': 'Some valid content here.'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_teaching_strategy_invalid_data_rejected(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/teaching-strategies/', {
            'iep_goal': 999999,
            'title': ''
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LessonPlanCreateTests(TestCase):
    """Regression tests for LessonPlanViewSet.create endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user1, self.teacher1, self.token1 = create_teacher_with_login('lp_owner@example.com')
        self.user2, self.teacher2, self.token2 = create_teacher_with_login('lp_other@example.com')

        self.student1 = create_student(self.teacher1, name='LP Student')
        self.iep1 = IEPModel.objects.create(studentID=self.student1)
        self.goal1 = IEPGoal.objects.create(
            iep=self.iep1,
            goalName='Reading Goal',
            target_metric='Read 50 words',
            annual_goal='Improve reading comprehension'
        )

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def test_create_lesson_plan_with_blank_content_generates_payload(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': self.goal1.pk,
            'title': 'Phonics Lesson',
            'topic': 'Phonics and Sound Blends'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        saved_plan = LessonPlan.objects.get(pk=response.data['data']['lessonID'])
        self.assertEqual(saved_plan.iep_goal, self.goal1)
        self.assertEqual(saved_plan.title, 'Phonics Lesson')
        self.assertTrue(len(saved_plan.lessonContent) > 0)
        # Content should be serialized JSON payload generated by LessonPlanManagerService
        parsed = json.loads(saved_plan.lessonContent)
        self.assertEqual(parsed.get('topic'), 'Phonics and Sound Blends')

    def test_create_lesson_plan_with_explicit_content(self):
        self._auth(self.token1)
        custom_content = "Pre-written lesson instructions step by step."
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': self.goal1.pk,
            'title': 'Manual Lesson',
            'lessonContent': custom_content,
            'status': 'Draft'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        saved_plan = LessonPlan.objects.get(pk=response.data['data']['lessonID'])
        self.assertEqual(saved_plan.lessonContent, custom_content)
        self.assertEqual(saved_plan.status, 'Draft')

    def test_create_lesson_plan_with_foreign_goal_rejected(self):
        self._auth(self.token2)
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': self.goal1.pk,
            'title': 'Foreign Lesson'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_lesson_plan_invalid_data_rejected(self):
        self._auth(self.token1)
        response = self.client.post('/api/resources/lesson-plans/', {
            'iep_goal': 999999,
            'title': ''
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
