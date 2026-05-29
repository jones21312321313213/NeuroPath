import re
import requests
from django.conf import settings


class CustomLlamaService:
    """
    Uses Groq's free API to run Llama 3.2 3B Instruct.
    Drop-in replacement — all existing callers work unchanged.
    """

    API_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL = "llama-3.1-8b-instant"

    SYSTEM_PROMPT = (
        "You are an expert Special Education teacher specializing in writing "
        "Individualized Education Program (IEP) goals. "
        "When asked to write an IEP goal, produce a single, specific, measurable, "
        "achievable, relevant, and time-bound (SMART) goal. "
        "Output only the goal text — no explanations, no bullet points, no preamble."
    )

    @staticmethod
    def generate_text(prompt, max_new_tokens=250):
        # Detect the cloud-delimiter system block used by RGORICheckerService
        system_content = CustomLlamaService.SYSTEM_PROMPT
        user_content   = prompt

        system_match = re.search(
            r"☁️system☁️(.*?)☁️/system☁️\s*☁️user☁️(.*?)☁️/user☁️",
            prompt,
            re.DOTALL,
        )
        if system_match:
            system_content = system_match.group(1).strip()
            user_content   = system_match.group(2).strip()

        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": CustomLlamaService.MODEL,
            "messages": [
                {"role": "system", "content": system_content},
                {"role": "user",   "content": user_content},
            ],
            "max_tokens": max_new_tokens,
            "temperature": 0.3,
        }

        try:
            response = requests.post(
                CustomLlamaService.API_URL,
                headers=headers,
                json=payload,
                timeout=60,
            )

            if response.status_code == 200:
                return response.json()["choices"][0]["message"]["content"].strip()
            elif response.status_code == 401:
                raise Exception(
                    "Groq API Error: Invalid or missing GROQ_API_KEY. Check your .env file."
                )
            elif response.status_code == 429:
                raise Exception(
                    "Groq API Error: Rate limit reached. Wait a moment and try again."
                )
            else:
                raise Exception(
                    f"Groq API Error: {response.status_code} - {response.text}"
                )

        except requests.exceptions.ConnectionError as e:
            raise Exception(
                f"❌ Cannot reach Groq API. Check internet access. Detail: {str(e)}"
            )
        except requests.exceptions.Timeout:
            raise Exception("❌ Groq API timed out after 60 seconds.")
        except Exception as e:
            raise Exception(f"❌ REAL ERROR: {str(e)}")