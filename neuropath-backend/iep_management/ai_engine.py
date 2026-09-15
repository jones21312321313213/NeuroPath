import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class AIEngineService:
    GEMINI_MODEL = 'gemini-1.5-flash'
    GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

    GROQ_MODEL = 'llama-3.3-70b-versatile'
    GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

    OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'
    OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

    OLLAMA_MODEL = 'llama3.2:3b'

    @classmethod
    def _call_gemini(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key or api_key in ('MISSING_KEY', ''):
            raise ValueError('Valid GEMINI_API_KEY not configured.')

        model = getattr(settings, 'GEMINI_MODEL', cls.GEMINI_MODEL)
        url = f"{cls.GEMINI_API_URL}/{model}:generateContent?key={api_key}"

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.3,
            }
        }

        if system_prompt:
            payload["system_instruction"] = {
                "parts": [{"text": system_prompt}]
            }

        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        headers = {
            "Content-Type": "application/json"
        }

        res = requests.post(url, headers=headers, json=payload, timeout=20)
        res.raise_for_status()
        data = res.json()

        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned by Gemini.")
            first_candidate = candidates[0]
            parts = first_candidate.get("content", {}).get("parts", [])
            if not parts or "text" not in parts[0]:
                finish_reason = first_candidate.get("finishReason", "UNKNOWN")
                raise ValueError(f"Gemini response contained no text parts (finishReason: {finish_reason}).")
            content = parts[0]["text"].strip()
            return content
        except (KeyError, IndexError, TypeError) as e:
            raise ValueError(f"Malformed response structure from Gemini: {e}")

    @classmethod
    def _call_groq(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        api_key = getattr(settings, 'GROQ_API_KEY', '')
        if not api_key or api_key in ('MISSING_KEY', ''):
            raise ValueError('Valid GROQ_API_KEY not configured.')

        model = getattr(settings, 'GROQ_MODEL', cls.GROQ_MODEL)
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': model,
            'messages': messages,
            'max_tokens': max_tokens,
            'temperature': 0.3,
        }
        if json_mode:
            payload['response_format'] = {'type': 'json_object'}

        res = requests.post(cls.GROQ_API_URL, headers=headers, json=payload, timeout=20)
        res.raise_for_status()
        data = res.json()
        return data['choices'][0]['message']['content'].strip()

    @classmethod
    def _call_openrouter(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        api_key = getattr(settings, 'OPENROUTER_API_KEY', '')
        if not api_key or api_key in ('MISSING_KEY', ''):
            raise ValueError('Valid OPENROUTER_API_KEY not configured.')

        model = getattr(settings, 'OPENROUTER_MODEL', cls.OPENROUTER_MODEL)
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://neuropath.app',
            'X-Title': 'NeuroPath',
        }
        payload = {
            'model': model,
            'messages': messages,
            'max_tokens': max_tokens,
            'temperature': 0.3,
        }
        if json_mode:
            payload['response_format'] = {'type': 'json_object'}

        res = requests.post(cls.OPENROUTER_API_URL, headers=headers, json=payload, timeout=20)
        res.raise_for_status()
        data = res.json()
        return data['choices'][0]['message']['content'].strip()

    @classmethod
    def _call_ollama(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        import ollama
        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        kwargs = {'model': cls.OLLAMA_MODEL, 'messages': messages}
        if json_mode:
            kwargs['format'] = 'json'

        response = ollama.chat(**kwargs)
        return response['message']['content'].strip()

    @classmethod
    def _deterministic_fallback(cls, prompt, json_mode=False):
        if json_mode:
            return json.dumps({
                'lesson_plans': [
                    {
                        'objective_focus': 'Foundational Skill Acquisition and Guided Practice',
                        'introduction': 'Orient the student using visual schedule cards and set clear behavioral expectations.',
                        'core_activity': 'Provide multi-sensory hands-on practice with structured teacher modeling and tactile manipulatives.',
                        'assessment': 'Check for 4 out of 5 correct independent trials with positive reinforcement.',
                        'materials_needed': ['Visual schedule board', 'Token reinforcement chart', 'Manipulative work kit']
                    }
                ]
            })
        return (
            'The learner demonstrates steady progress when provided with structured routines, '
            'visual prompts, and individualized pacing. Continuing with multimodal instructional strategies, '
            'frequent positive reinforcement, and planned sensory breaks will best support mastery across key learning targets.'
        )

    @classmethod
    def generate_text(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        errors = []

        # Tier 1 (Primary Cloud): Google Gemini
        try:
            content = cls._call_gemini(
                prompt, system_prompt=system_prompt, max_tokens=max_tokens, json_mode=json_mode
            )
            if content:
                return content, 'gemini'
        except Exception as e:
            logger.warning('Gemini call failed: %s. Attempting Groq fallback.', e)
            errors.append(f"Gemini: {e}")

        # Tier 2 (Fast Cloud Fallback): Groq
        try:
            content = cls._call_groq(
                prompt, system_prompt=system_prompt, max_tokens=max_tokens, json_mode=json_mode
            )
            if content:
                return content, 'groq'
        except Exception as e:
            logger.warning('Groq call failed: %s. Attempting OpenRouter fallback.', e)
            errors.append(f"Groq: {e}")

        # Tier 3 (Universal Gateway Fallback): OpenRouter
        try:
            content = cls._call_openrouter(
                prompt, system_prompt=system_prompt, max_tokens=max_tokens, json_mode=json_mode
            )
            if content:
                return content, 'openrouter'
        except Exception as e:
            logger.warning('OpenRouter call failed: %s.', e)
            errors.append(f"OpenRouter: {e}")

        raise RuntimeError(f"All AI generation providers failed: {'; '.join(errors)}")
