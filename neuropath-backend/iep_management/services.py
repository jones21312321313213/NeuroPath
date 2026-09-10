from .models import GeneratedAIInsight
from .ai_engine import AIEngineService

class AIGenerationService:
    @staticmethod
    def generate_and_save_summary(student_instance, teacher_instance):
        prompt = f"""
        You are an expert Special Education Specialist. Write a concise, professional summary for a student's profile.
        Do NOT list strengths and challenges separately. Synthesize the information into a single, cohesive summary paragraph.

        Student Profile Data:
        - Student Name: {getattr(student_instance, 'name', 'Student')}
        - Age: {getattr(student_instance, 'age', 'N/A')}
        - Diagnosis/Disability: {getattr(student_instance, 'diagnosis', 'N/A')}
        - Assessment Result: {getattr(student_instance, 'assessmentResult', 'No recent assessment data.')}
        - Support Needs: {getattr(student_instance, 'support_needs', 'N/A')}
        - Learning Style: {getattr(student_instance, 'learning_style', 'N/A')}
        """

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if not isinstance(teacher_instance, User):
                email = getattr(teacher_instance, 'email', '')
                username = getattr(teacher_instance, 'name', '') or email or f'teacher_{getattr(teacher_instance, "pk", 1)}'
                user = User.objects.filter(email=email).first() if email else None
                if not user:
                    user = User.objects.filter(username=username).first()
                if not user:
                    user = User.objects.create(username=username, email=email)
                teacher_instance = user

            generated_summary, _ = AIEngineService.generate_text(
                prompt=prompt,
                system_prompt='You output only the requested summary paragraph. No conversational filler.',
                max_tokens=350
            )
            new_insight = GeneratedAIInsight.objects.create(
                student=student_instance,
                teacher=teacher_instance, 
                summary_text=generated_summary
            )
            return new_insight
        except Exception as e:
            raise Exception(f"AI Generation failed: {str(e)}")
