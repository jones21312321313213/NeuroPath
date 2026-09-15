import json
from unittest.mock import MagicMock, patch
from django.test import TestCase, override_settings
from iep_management.ai_engine import AIEngineService


class AIEngineServiceTestCase(TestCase):
    databases = []

    # ── Primary & Multi-Tier Cascade Tests ───────────────────────────────

    @patch('iep_management.ai_engine.AIEngineService._call_gemini')
    def test_gemini_primary_success(self, mock_gemini):
        mock_gemini.return_value = 'Gemini generated content'
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertEqual(content, 'Gemini generated content')
        self.assertEqual(provider, 'gemini')
        mock_gemini.assert_called_once_with(
            'Test prompt', system_prompt='', max_tokens=500, json_mode=False
        )

    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception('Gemini 503 Service Unavailable'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq')
    def test_fallback_to_groq_when_gemini_fails(self, mock_groq, mock_gemini):
        mock_groq.return_value = 'Groq generated content'
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertEqual(content, 'Groq generated content')
        self.assertEqual(provider, 'groq')
        mock_gemini.assert_called_once()
        mock_groq.assert_called_once()

    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception('Gemini Quota Exceeded'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq 429 Rate Limit'))
    @patch('iep_management.ai_engine.AIEngineService._call_openrouter')
    def test_fallback_to_openrouter_when_gemini_and_groq_fail(self, mock_openrouter, mock_groq, mock_gemini):
        mock_openrouter.return_value = 'OpenRouter generated content'
        content, provider = AIEngineService.generate_text('Test prompt')
        self.assertEqual(content, 'OpenRouter generated content')
        self.assertEqual(provider, 'openrouter')
        mock_gemini.assert_called_once()
        mock_groq.assert_called_once()
        mock_openrouter.assert_called_once()

    @patch('iep_management.ai_engine.AIEngineService._call_gemini', side_effect=Exception('Gemini error'))
    @patch('iep_management.ai_engine.AIEngineService._call_groq', side_effect=Exception('Groq error'))
    @patch('iep_management.ai_engine.AIEngineService._call_openrouter', side_effect=Exception('OpenRouter error'))
    def test_all_providers_fail_raises_runtime_error(self, mock_openrouter, mock_groq, mock_gemini):
        with self.assertRaises(RuntimeError) as ctx:
            AIEngineService.generate_text('Test prompt')
        self.assertIn('All AI generation providers failed', str(ctx.exception))
        self.assertIn('Gemini', str(ctx.exception))
        self.assertIn('Groq', str(ctx.exception))
        self.assertIn('OpenRouter', str(ctx.exception))

    # ── Gemini Provider Unit Tests ──────────────────────────────────────

    @override_settings(GEMINI_API_KEY='MISSING_KEY')
    def test_call_gemini_placeholder_key_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            AIEngineService._call_gemini('Test prompt')
        self.assertIn('Valid GEMINI_API_KEY not configured', str(ctx.exception))

    @override_settings(GEMINI_API_KEY='')
    def test_call_gemini_empty_key_raises_value_error(self):
        with self.assertRaises(ValueError):
            AIEngineService._call_gemini('Test prompt')

    @override_settings(GEMINI_API_KEY='test-gemini-key', GEMINI_MODEL='gemini-1.5-flash')
    @patch('requests.post')
    def test_call_gemini_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'candidates': [
                {
                    'content': {
                        'parts': [{'text': 'Generated Gemini response'}]
                    },
                    'finishReason': 'STOP'
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        res = AIEngineService._call_gemini(
            'Test prompt',
            system_prompt='You are a SPED teacher',
            max_tokens=400,
            json_mode=False
        )
        self.assertEqual(res, 'Generated Gemini response')
        mock_post.assert_called_once()

        url = mock_post.call_args[0][0]
        self.assertIn('gemini-1.5-flash:generateContent', url)
        self.assertIn('key=test-gemini-key', url)

        call_kwargs = mock_post.call_args[1]
        self.assertEqual(call_kwargs['headers']['Content-Type'], 'application/json')
        payload = call_kwargs['json']
        self.assertEqual(payload['contents'][0]['parts'][0]['text'], 'Test prompt')
        self.assertEqual(payload['system_instruction']['parts'][0]['text'], 'You are a SPED teacher')
        self.assertEqual(payload['generationConfig']['maxOutputTokens'], 400)
        self.assertNotIn('responseMimeType', payload['generationConfig'])

    @override_settings(GEMINI_API_KEY='test-gemini-key')
    @patch('requests.post')
    def test_call_gemini_json_mode(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'candidates': [
                {
                    'content': {
                        'parts': [{'text': '{"key": "value"}'}]
                    },
                    'finishReason': 'STOP'
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        res = AIEngineService._call_gemini('Generate JSON', json_mode=True)
        self.assertEqual(res, '{"key": "value"}')

        payload = mock_post.call_args[1]['json']
        self.assertEqual(payload['generationConfig']['responseMimeType'], 'application/json')
        self.assertNotIn('system_instruction', payload)

    @override_settings(GEMINI_API_KEY='test-gemini-key')
    @patch('requests.post')
    def test_call_gemini_empty_candidates_raises_value_error(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {'candidates': []}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        with self.assertRaises(ValueError) as ctx:
            AIEngineService._call_gemini('Test prompt')
        self.assertIn('No candidates returned by Gemini', str(ctx.exception))

    @override_settings(GEMINI_API_KEY='test-gemini-key')
    @patch('requests.post')
    def test_call_gemini_safety_block_raises_value_error(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'candidates': [
                {
                    'content': {'parts': []},
                    'finishReason': 'SAFETY'
                }
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        with self.assertRaises(ValueError) as ctx:
            AIEngineService._call_gemini('Test prompt')
        self.assertIn('SAFETY', str(ctx.exception))

    # ── Groq Provider Unit Tests ────────────────────────────────────────

    @override_settings(GROQ_API_KEY='MISSING_KEY')
    def test_call_groq_missing_key_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            AIEngineService._call_groq('Test prompt')
        self.assertIn('Valid GROQ_API_KEY not configured', str(ctx.exception))

    @override_settings(GROQ_API_KEY='test-groq-key', GROQ_MODEL='llama-3.3-70b-versatile')
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
        self.assertEqual(call_kwargs['headers']['Authorization'], 'Bearer test-groq-key')
        self.assertEqual(call_kwargs['json']['model'], 'llama-3.3-70b-versatile')
        self.assertEqual(call_kwargs['json']['response_format'], {'type': 'json_object'})
        self.assertEqual(len(call_kwargs['json']['messages']), 2)

    # ── OpenRouter Provider Unit Tests ──────────────────────────────────

    @override_settings(OPENROUTER_API_KEY='MISSING_KEY')
    def test_call_openrouter_missing_key_raises_value_error(self):
        with self.assertRaises(ValueError) as ctx:
            AIEngineService._call_openrouter('Test prompt')
        self.assertIn('Valid OPENROUTER_API_KEY not configured', str(ctx.exception))

    @override_settings(OPENROUTER_API_KEY='test-openrouter-key', OPENROUTER_MODEL='meta-llama/llama-3.3-70b-instruct:free')
    @patch('requests.post')
    def test_call_openrouter_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'choices': [
                {'message': {'content': 'Generated OpenRouter response'}}
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response

        res = AIEngineService._call_openrouter('Test prompt', system_prompt='System prompt', json_mode=True)
        self.assertEqual(res, 'Generated OpenRouter response')
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args[1]
        self.assertEqual(call_kwargs['headers']['Authorization'], 'Bearer test-openrouter-key')
        self.assertEqual(call_kwargs['headers']['HTTP-Referer'], 'https://neuropath.app')
        self.assertEqual(call_kwargs['headers']['X-Title'], 'NeuroPath')
        self.assertEqual(call_kwargs['json']['model'], 'meta-llama/llama-3.3-70b-instruct:free')
        self.assertEqual(call_kwargs['json']['response_format'], {'type': 'json_object'})

    # ── Helper & Compatibility Tests ────────────────────────────────────

    def test_deterministic_fallback_text(self):
        content = AIEngineService._deterministic_fallback('Test prompt')
        self.assertIsInstance(content, str)
        self.assertIn('The learner demonstrates steady progress', content)

    def test_deterministic_fallback_json_mode(self):
        content = AIEngineService._deterministic_fallback('Test prompt', json_mode=True)
        parsed = json.loads(content)
        self.assertIn('lesson_plans', parsed)
        self.assertIsInstance(parsed['lesson_plans'], list)
        self.assertGreater(len(parsed['lesson_plans']), 0)
        first_plan = parsed['lesson_plans'][0]
        self.assertIn('objective_focus', first_plan)
        self.assertIn('core_activity', first_plan)

    @patch('ollama.chat')
    def test_call_ollama_compatibility(self, mock_ollama_chat):
        mock_ollama_chat.return_value = {'message': {'content': 'Ollama response'}}
        res = AIEngineService._call_ollama('Test prompt', system_prompt='System prompt', json_mode=True)
        self.assertEqual(res, 'Ollama response')
        mock_ollama_chat.assert_called_once_with(
            model=AIEngineService.OLLAMA_MODEL,
            messages=[
                {'role': 'system', 'content': 'System prompt'},
                {'role': 'user', 'content': 'Test prompt'}
            ],
            format='json'
        )
