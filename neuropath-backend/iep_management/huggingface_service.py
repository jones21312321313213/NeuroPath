import requests
import socket
import urllib3.util.connection as urllib3_cn
from django.conf import settings

# 🛑 THE MAGIC FIX: Force Python to ignore broken IPv6 Hotspot DNS and use stable IPv4
def allowed_gai_family():
    return socket.AF_INET
urllib3_cn.allowed_gai_family = allowed_gai_family


class CustomLlamaService:
    API_URL = "https://api-inference.huggingface.co/models/juswa12/neuropath-iep-llama3-v3/v1/chat/completions"
    
    HF_TOKEN = settings.HF_TOKEN

    @staticmethod
    def generate_text(prompt, max_new_tokens=250):
        headers = {
            "Authorization": f"Bearer {CustomLlamaService.HF_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "juswa12/neuropath-iep-llama3-v3",
            "messages": [
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "max_tokens": max_new_tokens,
            "temperature": 0.3
        }
        
        try:
            response = requests.post(CustomLlamaService.API_URL, headers=headers, json=payload)
            
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content'].strip()
            else:
                raise Exception(f"Hugging Face API Error: {response.status_code} - {response.text}")
                
        except Exception as e:
            # Unmasked error so we can always see the truth!
            raise Exception(f"❌ REAL ERROR: {str(e)}")