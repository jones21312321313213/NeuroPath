import ollama
from .models import GeneratedAIInsight

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
            response = ollama.chat(model='llama3.2:3b', messages=[
                {'role': 'system', 'content': 'You output only the requested summary paragraph. No conversational filler.'},
                {'role': 'user', 'content': prompt}
            ])
            
            generated_summary = response['message']['content'].strip()
            
            # Save BOTH the student and the teacher
            new_insight = GeneratedAIInsight.objects.create(
                student=student_instance,
                teacher=teacher_instance, 
                summary_text=generated_summary
            )
            
            return new_insight
            
        except Exception as e:
            raise Exception(f"AI Generation failed: {str(e)}")