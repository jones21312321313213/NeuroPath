import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

class CustomLlamaService:
    # 🎯 Pointing directly to your fine-tuned v3 model
    BASE_MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"
    ADAPTER_ID = "juswa12/neuropath-iep-llama3-v3"
    
    # Class-level variables to hold the massive model in memory
    tokenizer = None
    model = None

    @classmethod
    def _load_model(cls):
        """Loads the massive model into your laptop's memory only once."""
        if cls.model is None or cls.tokenizer is None:
            print("⏳ Loading tokenizer...")
            cls.tokenizer = AutoTokenizer.from_pretrained(cls.BASE_MODEL_ID)
            cls.tokenizer.pad_token = cls.tokenizer.eos_token

            print("⏳ Downloading and loading base Llama 3 in 4-bit mode to save RAM...")
            # 8B models require about 16GB RAM. 4-bit quantization shrinks this to ~6GB.
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
            )
            
            base_model = AutoModelForCausalLM.from_pretrained(
                cls.BASE_MODEL_ID,
                quantization_config=bnb_config,
                device_map="auto",
            )
            
            print("🧠 Downloading and attaching your custom IEP v3 adapter...")
            cls.model = PeftModel.from_pretrained(base_model, cls.ADAPTER_ID)
            cls.model.eval()
            print("✅ Local offline model successfully loaded!")

    @staticmethod
    def generate_text(prompt, max_new_tokens=600):
        # 1. Boot up the model (downloads automatically on the first run)
        CustomLlamaService._load_model()

        # 2. NO SYSTEM PROMPT! We format it exactly like your v3 training CSV
        formatted_prompt = f"### Human:\nGenerate an individualized education plan based on the student information below.\n\n{prompt}\n\n### Assistant:\n"

        # 3. Tokenize and Generate
        inputs = CustomLlamaService.tokenizer(
            formatted_prompt, return_tensors="pt"
        ).to(CustomLlamaService.model.device)

        with torch.no_grad():
            outputs = CustomLlamaService.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.7,
                do_sample=True,
                pad_token_id=CustomLlamaService.tokenizer.eos_token_id,
            )

        # 4. Clean and return the generated output
        raw_text = CustomLlamaService.tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        if "### Assistant:" in raw_text:
            return raw_text.split("### Assistant:")[-1].strip()
        return raw_text.strip()