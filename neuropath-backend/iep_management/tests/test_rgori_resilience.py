import json
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel
from iep_management.rgori_service import RGORICheckerService
from iep_management.views import GenerateIEPGoalsFromIEPView


class RGORIResilienceTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.auth_user = User.objects.create_user(
            username='teacher_rgori@test.com',
            email='teacher_rgori@test.com',
            password='TestPassword123!'
        )
        self.teacher = Teacher.objects.create(
            email='teacher_rgori@test.com',
            name='Teacher Brenda',
            passwordHash='hash'
        )
        self.student = StudentProfile.objects.create(
            name='Marcus Aurelius',
            age=11,
            teacher=self.teacher,
            diagnosis='Autism Spectrum Disorder',
            support_needs='Visual structure and sensory accommodations',
            parental_consent_obtained=True,
            guardian_name='Aurelius Guardian',
            consent_date='2026-09-11',
        )
        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            accommodations='Visual schedules, noise dampening headphones',
            difficulties='Difficulty in social communication',
            learning_barriers='Moderate barrier',
            learning_facilitators='SNED Teacher, Speech Therapist'
        )
        self.client.force_authenticate(user=self.auth_user)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_valid_json_parsing(self, mock_ai):
        mock_payload = {
            "total_score": 85,
            "breakdown": {
                "measurability": 22,
                "functionality": 21,
                "generality": 21,
                "instructional_context": 21
            },
            "feedback": "Strong observable verbs and clear measurement criteria.",
            "compliant": True
        }
        mock_ai.return_value = (json.dumps(mock_payload), 'groq')

        result = RGORICheckerService.evaluate_goal("Marcus will communicate using PECS", "Marcus, ASD")
        self.assertEqual(result["total_score"], 85)
        self.assertTrue(result["compliant"])
        self.assertEqual(result["breakdown"]["measurability"], 22)
        self.assertIn("Strong observable verbs", result["feedback"])

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_markdown_wrapped_json(self, mock_ai):
        mock_payload = {
            "total_score": 78,
            "breakdown": {
                "measurability": 20,
                "functionality": 20,
                "generality": 19,
                "instructional_context": 19
            },
            "feedback": "Acceptable goal across all 4 R-GORI criteria.",
            "compliant": True
        }
        mock_ai.return_value = (f"```json\n{json.dumps(mock_payload)}\n```", 'ollama')

        result = RGORICheckerService.evaluate_goal("Marcus will write letters", "Marcus, Grade 3")
        self.assertEqual(result["total_score"], 78)
        self.assertTrue(result["compliant"])
        self.assertEqual(result["breakdown"]["functionality"], 20)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_unparsable_response_raises_error(self, mock_ai):
        # AI returns non-JSON or corrupted output
        mock_ai.return_value = ("Corrupted non-json text from provider", 'groq')

        with self.assertRaises(RuntimeError) as ctx:
            RGORICheckerService.evaluate_goal("Marcus will read words", "Marcus context")
        self.assertIn("Failed to parse R-GORI evaluation", str(ctx.exception))

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_checker_missing_score_metrics_raises_error(self, mock_ai):
        # AI returns template json missing required scores
        mock_ai.return_value = (json.dumps({"lesson_plans": [{"objective_focus": "Focus"}]}), 'groq')

        with self.assertRaises(RuntimeError) as ctx:
            RGORICheckerService.evaluate_goal("Marcus will count to 20", "Marcus context")
        self.assertIn("Failed to parse R-GORI evaluation", str(ctx.exception))

    def test_rgori_checker_has_no_fallback_evaluation_method(self):
        self.assertFalse(hasattr(RGORICheckerService, '_fallback_evaluation'))

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_objective_rows_valid_json(self, mock_ai):
        mock_rows = [
            {
                "enroute_objectives": "Marcus will match 5 sight words with 80% accuracy.",
                "interventions_procedures": "Flashcards and token reinforcement.",
                "timeline_mins_session": "15 minutes daily",
                "individuals_responsible": "SNED Teacher",
                "progress_instructional": "Daily trial checklist.",
                "remarks": "Strong baseline."
            },
            {
                "enroute_objectives": "Marcus will read 5 sight words aloud independently.",
                "interventions_procedures": "Guided verbal prompting.",
                "timeline_mins_session": "15 minutes daily",
                "individuals_responsible": "SNED Teacher",
                "progress_instructional": "Weekly probe.",
                "remarks": "Enroute step 2."
            }
        ]
        mock_ai.return_value = (json.dumps(mock_rows), 'groq')

        view = GenerateIEPGoalsFromIEPView()
        rows = view._generate_objective_rows(
            student_name='Marcus',
            difficulty='Reading',
            assistive_tech='Sight word cards',
            annual_goal='Marcus will read 20 sight words.',
            facilitators='SNED Teacher',
            goal_area='Literacy Skills'
        )
        self.assertEqual(len(rows), 2)
        self.assertTrue(
            rows[0]["enroute_objectives"].startswith("Marcus will match 5 sight words with 80% accuracy.")
        )
        self.assertIn("(TP_", rows[0]["enroute_objectives"])

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_objective_rows_unparsable_raises_error(self, mock_ai):
        mock_ai.return_value = ("Not a JSON array", 'groq')

        view = GenerateIEPGoalsFromIEPView()
        with self.assertRaises(RuntimeError) as ctx:
            view._generate_objective_rows(
                student_name='Marcus',
                difficulty='Math',
                assistive_tech='Counting cubes',
                annual_goal='Marcus will add numbers within 10.',
                facilitators='SNED Teacher',
                goal_area='Mathematics'
            )
        self.assertIn("could not", str(ctx.exception).lower())

    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception('Gemini offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_openrouter', side_effect=Exception('OpenRouter offline'))
    def test_generate_goals_from_iep_view_offline_cascade(self, mock_openrouter, mock_groq, mock_gemini):
        """
        When external LLMs (Ollama & Groq) are completely offline,
        POST /api/iep/generate-goals-from-iep/ MUST return HTTP 200 with valid goals and objective rows.
        """
        url = '/api/iep/generate-goals-from-iep/'
        payload = {
            "iep_id": self.iep.pk,
            "student_name": self.student.name,
            "goal_area": "Communication Skills",
            "teacher_prompt": "Focus on verbal greetings",
            "accommodations": "Visual schedule",
            "difficulties": "Difficulty in communicating",
            "learning_barriers": "Moderate barrier",
            "barrier_qualifiers": "Moderate barrier",
            "learning_facilitators": "SNED Teacher",
            "facilitator_qualifiers": "Special Education Professionals",
            "special_factor_notes": "Needs quiet environment during transitions",
            "generatedDetails": {
                "special_factors_considerations": [
                    {
                        "difficulty": "Difficulty in communicating",
                        "assistive_technology": "PECS communication board"
                    }
                ]
            }
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 503, f"Expected 503 Service Unavailable, got {response.status_code}: {response.data}")
        data = response.json()
        self.assertIn("temporarily unavailable", data["error"])

    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception('Gemini offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq')
    def test_generate_goals_from_iep_view_online_groq(self, mock_groq, mock_gemini):
        """
        When Groq is online, POST /api/iep/generate-goals-from-iep/ succeeds with LLM output.
        """
        mock_groq.side_effect = [
            "Marcus will initiate a greeting with peers in 4 out of 5 opportunities.", # annual goal attempt 1
            "During morning circle and snack transition, given visual social stories, Marcus will initiate a greeting with peers across 2 classroom settings and 2 communicative partners in 4 out of 5 opportunities across 3 consecutive weeks.", # attempt 2 after R-GORI self-correction
            json.dumps([{
                "enroute_objectives": "Marcus will wave hello when greeted.",
                "interventions_procedures": "Teacher modeling and gesture prompts.",
                "timeline_mins_session": "10 minutes daily",
                "individuals_responsible": "SNED Teacher",
                "progress_instructional": "Mastery checklist.",
                "remarks": "Enroute sub-skill 1."
            }]) # Objective rows
        ]

        url = '/api/iep/generate-goals-from-iep/'
        payload = {
            "iep_id": self.iep.pk,
            "student_name": self.student.name,
            "goal_area": "Social-Emotional Skills",
            "difficulties": "Difficulty in interacting with peers",
            "generatedDetails": {
                "special_factors_considerations": [
                    {
                        "difficulty": "Difficulty in interacting with peers",
                        "assistive_technology": "Visual social stories"
                    }
                ]
            }
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        goal = data["goals"][0]
        self.assertIn("initiate a greeting", goal["annual_goal"])
        self.assertEqual(len(goal["objective_rows"]), 1)

    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception('Gemini offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_openrouter', side_effect=Exception('OpenRouter offline'))
    def test_generate_iep_goal_api_view_offline_cascade(self, mock_openrouter, mock_groq, mock_gemini):
        """
        POST /api/iep/generate-goal/ returns HTTP 503 when LLM providers are offline.
        """
        url = '/api/iep/generate-goal/'
        payload = {
            "student_name": "Marcus Aurelius",
            "diagnosis": "ASD",
            "baseline_barriers": "Needs visual cues",
            "target_domain": "Communication"
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 503)
        data = response.json()
        self.assertIn("temporarily unavailable", data["error"])

    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_objective_rows', side_effect=RuntimeError("Objective rows generation failed"))
    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_annual_goal', return_value="Marcus will initiate greetings.")
    def test_generate_goals_from_iep_view_fails_when_objective_rows_fail(self, mock_goal, mock_rows):
        """
        When objective rows fail to generate, ensure no canned rows are returned and
        POST /api/iep/generate-goals-from-iep/ returns HTTP 503 honestly.
        """
        url = '/api/iep/generate-goals-from-iep/'
        payload = {
            "iep_id": self.iep.pk,
            "student_name": self.student.name,
            "goal_area": "Social-Emotional Skills",
            "difficulties": "Difficulty in interacting with peers",
            "generatedDetails": {
                "special_factors_considerations": [
                    {
                        "difficulty": "Difficulty in interacting with peers",
                        "assistive_technology": "Visual social stories"
                    }
                ]
            }
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 503)
        data = response.json()
        self.assertIn("temporarily unavailable", data["error"])
        self.assertIn("Objective rows generation failed", data["details"])

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_iep_goal_api_view_last_error_initialized_without_exception(self, mock_ai):
        """
        Ensures that if best_goal is empty without an exception occurring,
        the 503 response does not trigger UnboundLocalError.
        """
        mock_ai.return_value = ("", 'gemini')

        url = '/api/iep/generate-goal/'
        payload = {
            "student_name": "Marcus Aurelius",
            "diagnosis": "ASD",
            "baseline_barriers": "Needs visual cues",
            "target_domain": "Communication"
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 503)
        self.assertIn("error", response.json())
        self.assertIsNone(response.json()["details"])


class AIEngineSchemaDecodingTests(TestCase):
    @patch('iep_management.ai_engine.AIEngineService._post_with_retry')
    def test_call_gemini_attaches_response_schema_when_json_mode(self, mock_post):
        from iep_management.ai_engine import AIEngineService

        class FakeResp:
            status_code = 200
            def raise_for_status(self):
                pass
            def json(self):
                return {"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}

        mock_post.return_value = FakeResp()
        schema = {
            "type": "object",
            "properties": {"ok": {"type": "boolean"}},
            "required": ["ok"],
        }
        with self.settings(GEMINI_API_KEY="test-key"):
            out = AIEngineService._call_gemini(
                "Return JSON", json_mode=True, response_schema=schema
            )
        self.assertEqual(out, '{"ok": true}')
        sent_payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(sent_payload["generationConfig"]["responseSchema"], schema)

    @patch('iep_management.ai_engine.AIEngineService._post_with_retry')
    def test_call_groq_rejects_json_missing_required_schema_keys(self, mock_post):
        from iep_management.ai_engine import AIEngineService

        class FakeResp:
            status_code = 200
            def raise_for_status(self):
                pass
            def json(self):
                return {"choices": [{"message": {"content": '{"wrong": 1}'}}]}

        mock_post.return_value = FakeResp()
        schema = {
            "type": "object",
            "properties": {"indicators": {"type": "object"}},
            "required": ["indicators"],
        }
        with self.settings(GROQ_API_KEY="test-key"):
            with self.assertRaises(ValueError):
                AIEngineService._call_groq(
                    "Return JSON", json_mode=True, response_schema=schema
                )


class RGORI10IndicatorRubricTests(TestCase):
    EXPECTED_INDICATORS = (
        "observable_verb",
        "baseline_calibrated_criterion",
        "evaluation_schedule_timeline",
        "stimulus_prompt_condition",
        "naturalistic_routine_context",
        "plaafp_baseline_traceability",
        "functional_daily_academic_utility",
        "cross_setting_material_person",
        "maintenance_generality_criterion",
        "sequential_milestone_alignment",
    )

    def test_audit_goal_explainable_returns_10_indicators_and_25pt_breakdown(self):
        goal = (
            "During morning circle and small-group literacy stations, given visual schedule strips "
            "and peer models, Alex will independently initiate and respond to 2-step classroom "
            "directions across 2 classroom settings and 2 communicative partners (teacher and peer) "
            "with 85% accuracy across 4 consecutive weeks."
        )
        context = "Difficulties: following directions, communication. Accommodations: visual schedule strips."
        audit = RGORICheckerService.audit_goal_explainable(goal, context)

        self.assertIn("indicators", audit)
        indicators = audit["indicators"]
        self.assertEqual(set(indicators.keys()), set(self.EXPECTED_INDICATORS))
        self.assertEqual(sum(ind["max_score"] for ind in indicators.values()), 100)
        self.assertGreaterEqual(audit["total_score"], 85)
        self.assertEqual(audit["status"], "Exemplary")
        self.assertFalse(audit.get("boilerplate_capped", False))
        for dim in ("measurability", "functionality", "generality", "instructional_context"):
            self.assertLessEqual(audit["breakdown"][dim]["score"], 25)
            self.assertGreaterEqual(audit["breakdown"][dim]["score"], 0)

    def test_boilerplate_goal_is_deterministically_capped_at_80_or_below(self):
        boilerplate_goal = (
            "Given visual cues, Alex will independently identify 10 sight words "
            "with 80% accuracy in 4 of 5 trials."
        )
        audit = RGORICheckerService.audit_goal_explainable(
            boilerplate_goal, "Difficulties: sight word recognition. Accommodations: visual cues."
        )
        self.assertLessEqual(audit["total_score"], 80)
        self.assertNotEqual(audit["status"], "Exemplary")
        self.assertTrue(audit["boilerplate_capped"])

    def test_vague_goal_remains_review_advised(self):
        vague_goal = "Alex will understand and appreciate reading."
        audit = RGORICheckerService.audit_goal_explainable(vague_goal, "")
        self.assertLess(audit["total_score"], 65)
        self.assertFalse(audit["compliant"])
        self.assertEqual(audit["status"], "Review Advised")


class RGORISureAndDeterministicTests(TestCase):
    def test_parse_evaluation_ignores_spoofed_llm_total_and_compliant(self):
        spoofed_raw = json.dumps({
            "total_score": 99,
            "compliant": True,
            "breakdown": {
                "measurability": 10,
                "functionality": 10,
                "generality": 10,
                "instructional_context": 10,
            },
            "feedback": "Looks great!",
        })
        parsed = RGORICheckerService._parse_evaluation(spoofed_raw)
        self.assertEqual(parsed["total_score"], 40)
        self.assertFalse(parsed["compliant"])
        self.assertEqual(parsed["status"], "Review Advised")

    def test_sure_gate_flags_discrepancy_over_15_points(self):
        # Vague goal scores low structurally (< 45), but LLM gives 90
        vague_goal = "Alex will understand and appreciate reading."
        high_llm_raw = json.dumps({
            "indicators": {
                "observable_verb": 9,
                "baseline_calibrated_criterion": 9,
                "evaluation_schedule_timeline": 9,
                "stimulus_prompt_condition": 14,
                "naturalistic_routine_context": 9,
                "plaafp_baseline_traceability": 14,
                "functional_daily_academic_utility": 9,
                "cross_setting_material_person": 8,
                "maintenance_generality_criterion": 5,
                "sequential_milestone_alignment": 4,
            },
            "feedback": "Strong goal.",
        })
        parsed = RGORICheckerService._parse_evaluation(
            high_llm_raw, goal_text=vague_goal, student_context=""
        )
        self.assertEqual(parsed["total_score"], 90)
        self.assertTrue(parsed["uncertainty_review_advised"])
        self.assertIn("uncertainty", parsed["feedback"].lower())

    def test_sure_gate_flags_borderline_60_to_68_score(self):
        goal = (
            "During morning circle, given visual cues, Alex will follow 2-step directions "
            "across 2 classroom settings for 2 consecutive weeks."
        )
        borderline_raw = json.dumps({
            "breakdown": {
                "measurability": 16,
                "functionality": 17,
                "generality": 16,
                "instructional_context": 16,
            },
            "feedback": "Borderline goal.",
        })
        parsed = RGORICheckerService._parse_evaluation(
            borderline_raw, goal_text=goal, student_context="Difficulties: following directions."
        )
        self.assertEqual(parsed["total_score"], 65)
        self.assertTrue(parsed["uncertainty_review_advised"])

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_evaluate_goal_uses_response_schema_and_deterministic_scoring(self, mock_ai):
        mock_ai.return_value = (
            json.dumps({
                "indicators": {
                    "observable_verb": 10,
                    "baseline_calibrated_criterion": 10,
                    "evaluation_schedule_timeline": 10,
                    "stimulus_prompt_condition": 15,
                    "naturalistic_routine_context": 10,
                    "plaafp_baseline_traceability": 15,
                    "functional_daily_academic_utility": 10,
                    "cross_setting_material_person": 10,
                    "maintenance_generality_criterion": 5,
                    "sequential_milestone_alignment": 5,
                },
                "feedback": "Comprehensive exemplary goal.",
            }),
            "gemini",
        )
        goal = (
            "During morning circle and small-group literacy stations, given visual schedule strips "
            "and peer models, Alex will independently initiate and respond to 2-step classroom "
            "directions across 2 classroom settings and 2 communicative partners (teacher and peer) "
            "with 85% accuracy across 4 consecutive weeks."
        )
        result = RGORICheckerService.evaluate_goal(
            goal, "Difficulties: following directions. Accommodations: visual schedule strips."
        )
        self.assertEqual(result["total_score"], 100)
        self.assertEqual(result["status"], "Exemplary")
        self.assertFalse(result["uncertainty_review_advised"])
        self.assertEqual(
            mock_ai.call_args.kwargs.get("response_schema"),
            RGORICheckerService.RGORI_EVALUATION_SCHEMA,
        )


class RGORISelfCorrectionGateTests(TestCase):
    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_objective_rows')
    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_annual_goal')
    def test_self_correction_triggers_once_when_initial_goal_lacks_generality_or_context(self, mock_goal, mock_rows):
        vague_draft = "Alex will understand and appreciate reading."
        improved_goal = (
            "During morning circle and small-group literacy stations, given visual schedule strips, "
            "Alex will independently identify 10 sight words across 2 classroom settings and 2 partners "
            "with 85% accuracy across 4 consecutive weeks."
        )
        mock_goal.side_effect = [vague_draft, improved_goal]
        mock_rows.return_value = [{"enroute_objectives": "Matching sight words\n(TP_EFP-rw-NG-1)"}]

        view = GenerateIEPGoalsFromIEPView()
        payload, err = view._generate_validated_goal(
            iep_id=1,
            student_name="Alex",
            difficulty="Reading comprehension",
            assistive_tech="Visual schedule strips",
            accommodations="Visual cues",
            facilitators="SPED Teacher",
            student_context="Difficulties: reading comprehension. Accommodations: visual schedule strips.",
            goal_area="Functional Academic Skills",
        )
        self.assertIsNone(err)
        self.assertEqual(mock_goal.call_count, 2)
        self.assertEqual(mock_rows.call_count, 1)
        self.assertEqual(payload["_attempts"], 2)
        self.assertEqual(payload["annual_goal"], improved_goal)
        self.assertGreaterEqual(payload["rgori_audit"]["total_score"], 85)
        second_call_prompt = mock_goal.call_args_list[1].kwargs.get("teacher_prompt", "")
        self.assertIn("R-GORI", second_call_prompt)

    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_objective_rows')
    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_annual_goal')
    def test_self_correction_stops_at_max_two_attempts_when_both_fail(self, mock_goal, mock_rows):
        mock_goal.side_effect = [
            "Alex will understand reading.",
            "Alex will appreciate math.",
        ]
        mock_rows.return_value = [{"enroute_objectives": "Counting\n(TP_MFP-nv-NG-1)"}]

        view = GenerateIEPGoalsFromIEPView()
        payload, err = view._generate_validated_goal(
            iep_id=1,
            student_name="Alex",
            difficulty="Reading",
            assistive_tech="Visuals",
            accommodations="Visuals",
            facilitators="SPED Teacher",
            student_context="Difficulties: reading.",
            goal_area="Functional Academic Skills",
        )
        self.assertIsNone(err)
        self.assertEqual(mock_goal.call_count, 2)
        self.assertEqual(mock_rows.call_count, 1)
        self.assertEqual(payload["_attempts"], 2)

    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_objective_rows')
    @patch.object(GenerateIEPGoalsFromIEPView, '_generate_annual_goal')
    def test_strong_initial_goal_takes_single_attempt(self, mock_goal, mock_rows):
        strong_goal = (
            "During morning circle and small-group literacy stations, given visual schedule strips, "
            "Alex will independently identify 10 sight words across 2 classroom settings and 2 partners "
            "with 85% accuracy across 4 consecutive weeks."
        )
        mock_goal.return_value = strong_goal
        mock_rows.return_value = [{"enroute_objectives": "Matching sight words\n(TP_EFP-rw-NG-1)"}]

        view = GenerateIEPGoalsFromIEPView()
        payload, err = view._generate_validated_goal(
            iep_id=1,
            student_name="Alex",
            difficulty="Reading",
            assistive_tech="Visual schedule strips",
            accommodations="Visual cues",
            facilitators="SPED Teacher",
            student_context="Difficulties: reading. Accommodations: visual schedule strips.",
            goal_area="Functional Academic Skills",
        )
        self.assertIsNone(err)
        self.assertEqual(mock_goal.call_count, 1)
        self.assertEqual(mock_rows.call_count, 1)
        self.assertEqual(payload["_attempts"], 1)
