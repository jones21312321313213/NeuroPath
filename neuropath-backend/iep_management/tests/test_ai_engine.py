import json
from django.test import TestCase, override_settings
from unittest.mock import patch, MagicMock
from iep_management.ai_engine import AIEngineService

class AIEngineServiceTestCase(TestCase):
    databases = []

    @patch('iep_management.ai_engine.AIEngineService._call_ollama')
    def test_ollama_primary_success(self, mock_ollama):
        mock_ollama.return_value = 'Ollama generated summary'
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertEqual(content, 'Ollama generated summary')
        self.assertEqual(provider, 'ollama')

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Connection refused'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq')
    def test_fallback_to_groq_when_ollama_fails(self, mock_groq, mock_ollama):
        mock_groq.return_value = 'Groq generated summary'
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertEqual(content, 'Groq generated summary')
        self.assertEqual(provider, 'groq')

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Ollama offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq offline'))
    def test_fallback_to_deterministic_template(self, mock_groq, mock_ollama):
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertTrue(len(content) > 0)
        self.assertEqual(provider, 'template_fallback')

    @patch('iep_management.ai_engine.AIEngineService._call_ollama', side_effect=Exception('Ollama offline'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq offline'))
    def test_fallback_to_deterministic_template_json_mode(self, mock_groq, mock_ollama):
        content, provider = AIEngineService.generate_text('Test prompt', json_mode=True)
        self.assertEqual(provider, 'template_fallback')
        parsed = json.loads(content)
        self.assertIn('lesson_plans', parsed)
        self.assertIsInstance(parsed['lesson_plans'], list)
        self.assertGreater(len(parsed['lesson_plans']), 0)

    @override_settings(GROQ_API_KEY='MISSING_KEY')
    def test_call_groq_missing_key_raises_value_error(self):
        with self.assertRaises(ValueError):
            AIEngineService._call_groq('Test prompt')

    @override_settings(GROQ_API_KEY='test-valid-key')
    @patch('requests.post')
    def test_call_groq_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'choices': [
                {'message': {'content': 'Generated Groq response'}}
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        res = AIEngineService._call_groq('Test prompt', system_prompt='System instructions', json_mode=True)
        self.assertEqual(res, 'Generated Groq response')
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args[1]
        self.assertEqual(call_kwargs['headers']['Authorization'], 'Bearer test-valid-key')
        self.assertEqual(call_kwargs['json']['response_format'], {'type': 'json_object'})
