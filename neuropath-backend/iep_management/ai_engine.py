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

        primary_model = getattr(settings, 'GEMINI_MODEL', cls.GEMINI_MODEL)
        models_to_try = [primary_model]
        for fb in ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash']:
            if fb not in models_to_try:
                models_to_try.append(fb)

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }

        generation_config = {
            "maxOutputTokens": max_tokens,
            "temperature": 0.3,
        }

        if json_mode:
            generation_config["responseMimeType"] = "application/json"

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": generation_config,
        }

        if system_prompt:
            payload["system_instruction"] = {
                "parts": [{"text": system_prompt}]
            }

        last_res = None
        for model in models_to_try:
            current_payload = json.loads(json.dumps(payload))
            if "2.5" in model:
                # Gemini 2.5 allocates reasoning/thinking tokens by default which consume
                # maxOutputTokens. Setting thinkingBudget to 0 gives full budget to the output.
                current_payload["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}

            url = f"{cls.GEMINI_API_URL}/{model}:generateContent"
            res = requests.post(url, headers=headers, json=current_payload, timeout=20)
            if res.status_code == 404 and len(models_to_try) > 1:
                last_res = res
                continue
            res.raise_for_status()
            last_res = res
            break
        else:
            if last_res is not None:
                last_res.raise_for_status()
            raise ValueError("No valid Gemini model available.")

        data = last_res.json()

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

        primary_model = getattr(settings, 'GROQ_MODEL', cls.GROQ_MODEL)
        models_to_try = [primary_model]
        for fb in ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'llama-3.3-70b-versatile']:
            if fb not in models_to_try:
                models_to_try.append(fb)

        messages = []
        if system_prompt:
            messages.append({'role': 'system', 'content': system_prompt})
        messages.append({'role': 'user', 'content': prompt})

        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': primary_model,
            'messages': messages,
            'max_tokens': max_tokens,
            'temperature': 0.3,
        }
        if json_mode:
            payload['response_format'] = {'type': 'json_object'}

        last_res = None
        for model in models_to_try:
            payload['model'] = model
            res = requests.post(cls.GROQ_API_URL, headers=headers, json=payload, timeout=20)
            if res.status_code == 404 and len(models_to_try) > 1:
                last_res = res
                continue
            res.raise_for_status()
            last_res = res
            break
        else:
            if last_res is not None:
                last_res.raise_for_status()
            raise ValueError("No valid Groq model available.")

        data = last_res.json()
        return data['choices'][0]['message']['content'].strip()

    @classmethod
    def _call_openrouter(cls, prompt, system_prompt='', max_tokens=500, json_mode=False):
        api_key = getattr(settings, 'OPENROUTER_API_KEY', '')
        if not api_key or api_key in ('MISSING_KEY', ''):
            raise ValueError('Valid OPENROUTER_API_KEY not configured.')

        primary_model = getattr(settings, 'OPENROUTER_MODEL', cls.OPENROUTER_MODEL)
        models_to_try = [primary_model]
        for fb in ['google/gemma-4-26b-a4b-it:free', 'nvidia/nemotron-3.5-lightning:free', 'meta-llama/llama-3.3-70b-instruct:free']:
            if fb not in models_to_try:
                models_to_try.append(fb)

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
            'model': primary_model,
            'messages': messages,
            'max_tokens': max_tokens,
            'temperature': 0.3,
        }
        if json_mode:
            payload['response_format'] = {'type': 'json_object'}

        last_res = None
        for model in models_to_try:
            payload['model'] = model
            res = requests.post(cls.OPENROUTER_API_URL, headers=headers, json=payload, timeout=20)
            if res.status_code == 404 and len(models_to_try) > 1:
                last_res = res
                continue
            res.raise_for_status()
            last_res = res
            break
        else:
            if last_res is not None:
                last_res.raise_for_status()
            raise ValueError("No valid OpenRouter model available.")

        data = last_res.json()
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
