import json
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

class AIEngineService:
    OLLAMA_MODEL = 'llama3.2:3b'
    GROQ_MODEL = 'llama-3.1-8b-instant'
    GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

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
    def _call_groq(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        api_key = getattr(settings, 'GROQ_API_KEY', '')
        if not api_key or api_key in ('MISSING_KEY', ''):
            raise ValueError('Valid GROQ_API_KEY not configured.')

        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': cls.GROQ_MODEL,
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
        try:
            content = cls._call_ollama(prompt, system_prompt=system_prompt, max_tokens=max_tokens, json_mode=json_mode)
            if content:
                return content, 'ollama'
        except Exception as e:
            logger.warning('Ollama call failed: %s. Attempting Groq fallback.', e)

        try:
            content = cls._call_groq(prompt, system_prompt=system_prompt, max_tokens=max_tokens, json_mode=json_mode)
            if content:
                return content, 'groq'
        except Exception as e:
            logger.warning('Groq call failed: %s. Falling back to deterministic template.', e)

        return cls._deterministic_fallback(prompt, json_mode=json_mode), 'template_fallback'
