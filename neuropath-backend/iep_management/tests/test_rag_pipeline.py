import json
import os
import tempfile
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command
from users.models import Teacher, StudentProfile
from iep_management.models import IEPModel, SpedKnowledgeChunk
from iep_management.embedding_service import EmbeddingService
from iep_management.retriever_service import SemanticRetrieverService
from iep_management.privacy_utils import PIIScrubberService, scrub_pii_from_text
from iep_management.rgori_service import RGORICheckerService
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

User = get_user_model()


class RAGPipelineTests(TestCase):
    def setUp(self):
        # Create a sample user/teacher and student
        self.user = User.objects.create_user(username='teacher_test', password='password123', email='teacher@school.edu')
        self.teacher = Teacher.objects.create(name='teacher_test', email='teacher@school.edu', passwordHash='hash')
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)

        self.student = StudentProfile.objects.create(
            teacher=self.teacher,
            name='Juan Dela Cruz',
            guardian_name='Maria Dela Cruz',
            age=8,
            grade=2,
            diagnosis='Autism Spectrum Disorder',
            parental_consent_obtained=True
        )

        self.iep = IEPModel.objects.create(
            studentID=self.student,
            version=1,
            difficulties='Difficulty in communicating',
            accommodations='Visual schedule, picture communication board',
            learning_barriers='Severe barrier in expressing needs',
            learning_facilitators='SPED Teacher, speech therapist',
            generatedDetails={
                'special_factors_considerations': [
                    {
                        'difficulty': 'Difficulty in communicating',
                        'assistive_technology': 'PECS book, communication cards'
                    }
                ],
                'specialFactorNotes': 'Student uses picture exchange cards during snack time.'
            }
        )

        # Seed sample chunks for testing
        self.chunk1 = SpedKnowledgeChunk.objects.create(
            domain='Communication',
            category='ASD_Intervention',
            subcategory='PECS_Phase_1',
            target_age_group='Early_Childhood',
            content='[DOMAIN: Communication] PECS Phase 1 exchange protocol.',
            token_count=45,
            embedding=EmbeddingService.get_embedding('PECS picture exchange requesting', domain='Communication'),
            metadata={'evidence_tier': 'EBP_High'}
        )
        self.chunk2 = SpedKnowledgeChunk.objects.create(
            domain='Communication',
            category='DepEd_Competency',
            subcategory='Receptive_Communication',
            target_age_group='All_Elementary',
            content='[DOMAIN: Communication] DepEd Competency 2-step directive following.',
            token_count=50,
            embedding=EmbeddingService.get_embedding('DepEd receptive language directives', domain='Communication'),
            metadata={'deped_alignment': {'competency_code': 'SPED-COMM-01'}}
        )
        self.chunk3 = SpedKnowledgeChunk.objects.create(
            domain='Communication',
            category='RGORI_Rubric',
            subcategory='Exemplar_Goal',
            target_age_group='All_Elementary',
            content='[DOMAIN: Communication] R-GORI Exemplar Communication goal.',
            token_count=60,
            embedding=EmbeddingService.get_embedding('R-GORI communication goal exemplar', domain='Communication'),
            metadata={'rubric': 'Measurable criteria'}
        )

    # -------------------------------------------------------------
    # 1. SpedKnowledgeChunk Model Tests
    # -------------------------------------------------------------
    def test_sped_knowledge_chunk_creation(self):
        """Verifies SpedKnowledgeChunk model saves properly with 1536-dim vector."""
        self.assertEqual(SpedKnowledgeChunk.objects.filter(domain='Communication').count(), 3)
        chunk = SpedKnowledgeChunk.objects.get(subcategory='PECS_Phase_1')
        self.assertEqual(len(chunk.embedding), 1536)
        self.assertIn('PECS Phase 1', chunk.content)
        self.assertEqual(str(chunk), '[Communication | PECS_Phase_1] [DOMAIN: Communication] PECS Phase 1 exchange protocol....')

    # -------------------------------------------------------------
    # 2. EmbeddingService Tests
    # -------------------------------------------------------------
    def test_embedding_normalization_and_caching(self):
        """Verifies EmbeddingService normalizes text and caches vectors."""
        text = "  PECS picture exchange   REQUESTING  "
        vec1 = EmbeddingService.get_embedding(text, domain="Communication")
        self.assertEqual(len(vec1), 1536)
        
        # Second call should retrieve from cache
        vec2 = EmbeddingService.get_embedding(text, domain="Communication")
        self.assertEqual(vec1, vec2)

    def test_deterministic_mock_embedding_properties(self):
        """Verifies offline deterministic mock embeddings are L2 normalized."""
        vec = EmbeddingService._deterministic_mock_embedding("Sensory integration diet protocol")
        self.assertEqual(len(vec), 1536)
        # Verify L2 norm is approximately 1.0
        norm = sum(x * x for x in vec)
        self.assertAlmostEqual(norm, 1.0, places=2)

    # -------------------------------------------------------------
    # 3. SemanticRetrieverService Tests
    # -------------------------------------------------------------
    def test_semantic_retriever_domain_normalization(self):
        """Verifies domain alias normalization."""
        self.assertEqual(SemanticRetrieverService.normalize_domain('communication'), 'Communication')
        self.assertEqual(SemanticRetrieverService.normalize_domain('sensory-motor'), 'Sensory_Motor')
        self.assertEqual(SemanticRetrieverService.normalize_domain('adaptive_living'), 'Adaptive_Daily_Living')
        self.assertEqual(SemanticRetrieverService.normalize_domain('academic'), 'Cognitive')

    def test_semantic_retriever_retrieve_context(self):
        """Verifies hybrid retrieval returns Top-K diverse chunks."""
        results = SemanticRetrieverService.retrieve_context(
            domain='Communication',
            query_text='PECS picture exchange requesting',
            top_k=3
        )
        self.assertGreaterEqual(len(results), 1)
        self.assertIn('content', results[0])
        self.assertIn('similarity', results[0])
        self.assertIn('category', results[0])

    def test_semantic_retriever_format_context(self):
        """Verifies formatting of retrieved chunks for prompt injection."""
        results = SemanticRetrieverService.retrieve_context(
            domain='Communication',
            query_text='PECS exchange',
            top_k=2
        )
        formatted = SemanticRetrieverService.format_context_for_prompt(results)
        self.assertIn('REFERENCE CHUNK #1', formatted)
        self.assertIn('Communication', formatted)

    # -------------------------------------------------------------
    # 4. PIIScrubberService (RA 10173) Tests
    # -------------------------------------------------------------
    def test_pii_scrubbing_and_rehydration(self):
        """Verifies complete de-identification and surrogate re-hydration."""
        profile = {
            'full_name': 'Juan Dela Cruz',
            'first_name': 'Juan',
            'guardian_name': 'Maria Dela Cruz',
            'age': 8
        }
        raw_text = "Juan Dela Cruz (LRN: 123456789012, 8 years old) had a conference with Maria Dela Cruz at contact 09171234567 or email test@deped.gov.ph."
        sanitized, surrogates = PIIScrubberService.sanitize_plaafp(raw_text, profile)

        # Ensure direct PII is absent
        self.assertNotIn("Juan Dela Cruz", sanitized)
        self.assertNotIn("123456789012", sanitized)
        self.assertNotIn("09171234567", sanitized)
        self.assertNotIn("test@deped.gov.ph", sanitized)
        self.assertIn("[STUDENT_A]", sanitized)
        self.assertIn("[LRN_REDACTED]", sanitized)
        self.assertIn("[CONTACT_REDACTED]", sanitized)
        self.assertIn("[EMAIL_REDACTED]", sanitized)
        self.assertIn("[ELEM_PRIMARY]", sanitized)

        # Test Re-hydration
        rehydrated = PIIScrubberService.rehydrate_text("Goal drafted for [STUDENT_A] to communicate needs.", surrogates)
        self.assertEqual(rehydrated, "Goal drafted for Juan Dela Cruz to communicate needs.")

    def test_scrub_pii_from_text_enhanced(self):
        """Verifies scrub_pii_from_text handles LRN and contact numbers."""
        text = "Student Juan Dela Cruz (LRN 987654321012, phone 09181234567) needs support."
        scrubbed = scrub_pii_from_text(text, ["Juan Dela Cruz"])
        self.assertNotIn("Juan Dela Cruz", scrubbed)
        self.assertNotIn("987654321012", scrubbed)
        self.assertNotIn("09181234567", scrubbed)
        self.assertIn("[LRN_REDACTED]", scrubbed)
        self.assertIn("[CONTACT_REDACTED]", scrubbed)

    # -------------------------------------------------------------
    # 5. RGORICheckerService (80% Quality Gate) Tests
    # -------------------------------------------------------------
    def test_rgori_checker_80_percent_compliance_threshold(self):
        """Verifies RGORICheckerService sets compliance strictly at >= 80%."""
        # 78 should be non-compliant (< 80)
        eval_78 = RGORICheckerService._parse_evaluation(json.dumps({
            "total_score": 78,
            "breakdown": {"measurability": 20, "functionality": 20, "generality": 19, "instructional_context": 19},
            "feedback": "Needs higher generality."
        }))
        self.assertFalse(eval_78["compliant"])
        self.assertEqual(eval_78["total_score"], 78)

        # 82 should be compliant (>= 80)
        eval_82 = RGORICheckerService._parse_evaluation(json.dumps({
            "total_score": 82,
            "breakdown": {"measurability": 22, "functionality": 20, "generality": 20, "instructional_context": 20},
            "feedback": "Exemplary SMART goal."
        }))
        self.assertTrue(eval_82["compliant"])
        self.assertEqual(eval_82["total_score"], 82)

    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_rgori_repair_goal_invocation(self, mock_generate):
        """Verifies automated 1-cycle repair prompt is generated with deficient indicators."""
        mock_generate.return_value = (
            "The student will select 4 PECS icons with 80% accuracy across 4 consecutive classroom sessions.",
            'ollama'
        )
        evaluation = {
            "total_score": 68,
            "breakdown": {"measurability": 15, "functionality": 20, "generality": 15, "instructional_context": 18},
            "feedback": "Lacks observable verbs and multi-setting generality."
        }
        repaired = RGORICheckerService.repair_goal(
            "The student will learn to communicate better.",
            evaluation,
            "Student: Learner (Grade 2). Goal Area: Communication."
        )
        self.assertIn("PECS icons", repaired)
        mock_generate.assert_called_once()
        call_prompt = mock_generate.call_args[1]['prompt']
        self.assertIn("Measurability:", call_prompt)
        self.assertIn("Generality:", call_prompt)

    # -------------------------------------------------------------
    # 6. Management Command `seed_rag_knowledge` Tests
    # -------------------------------------------------------------
    def test_seed_rag_knowledge_command(self):
        """Verifies seed_rag_knowledge management command parses and populates chunks."""
        mock_data = [
            {
                "domain": "Cognitive",
                "category": "DepEd_Competency",
                "subcategory": "Test_Functional_Math",
                "target_age_group": "Elementary_Primary",
                "content": "[DOMAIN: Cognitive] Identifying quantities 1 to 10 using counting cubes.",
                "metadata": {"source": "DepEd"}
            }
        ]
        with tempfile.NamedTemporaryFile('w', delete=False, suffix='.json') as temp_file:
            json.dump(mock_data, temp_file)
            temp_path = temp_file.name

        try:
            call_command('seed_rag_knowledge', file=temp_path, clear=False, min_threshold=1)
            chunk = SpedKnowledgeChunk.objects.filter(subcategory='Test_Functional_Math').first()
            self.assertIsNotNone(chunk)
            self.assertEqual(chunk.domain, 'Cognitive')
            self.assertEqual(len(chunk.embedding), 1536)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # -------------------------------------------------------------
    # 7. End-to-End IEP Goal Generation with RAG Integration Test
    # -------------------------------------------------------------
    @patch('iep_management.views.GenerateIEPGoalsFromIEPView._generate_objective_rows')
    @patch('iep_management.rgori_service.RGORICheckerService.evaluate_goal')
    @patch('iep_management.ai_engine.AIEngineService.generate_text')
    def test_generate_iep_goals_from_iep_rag_integration(self, mock_ai_text, mock_rgori_eval, mock_obj_rows):
        """Verifies GenerateIEPGoalsFromIEPView retrieves chunks, injects context, and returns RAG metadata."""
        mock_ai_text.return_value = (
            "By the end of the school year, the learner will select and hand a PECS icon to communicate choices with 85% accuracy across 4 out of 5 consecutive trials.",
            'ollama'
        )
        mock_rgori_eval.return_value = {
            "total_score": 88,
            "breakdown": {"measurability": 23, "functionality": 22, "generality": 22, "instructional_context": 21},
            "feedback": "Compliant R-GORI goal grounded in PECS framework.",
            "compliant": True
        }
        mock_obj_rows.return_value = [
            {
                "enroute_objectives": "Reach for PECS card",
                "interventions_procedures": "Hand-over-hand prompting",
                "timeline_mins_session": "15 mins",
                "individuals_responsible": "SPED Teacher",
                "progress_instructional": "Baseline",
                "remarks": "Initiated"
            }
        ]

        url = '/api/iep/generate-goals-from-iep/'
        payload = {
            "iep_id": self.iep.pk,
            "goal_area": "Communication",
            "difficulties": "Difficulty in communicating",
            "accommodations": "PECS communication board",
            "learning_barriers": "Severe barrier",
            "learning_facilitators": "SPED Teacher",
            "generatedDetails": {
                "special_factors_considerations": [
                    {
                        "difficulty": "Difficulty in communicating",
                        "assistive_technology": "PECS book"
                    }
                ]
            }
        }

        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get('total_goals_generated'), 1)
        goal = data['goals'][0]
        self.assertEqual(goal.get('_rgori_score'), 88)
        self.assertIn('_retrieved_chunks', goal)
        self.assertIsInstance(goal.get('_retrieved_chunks'), list)
