from django.contrib.postgres.operations import CreateExtension
import pgvector.django.indexes
import pgvector.django.vector
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('iep_management', '0005_iepmodel_unique_student_iep_version'),
    ]

    operations = [
        CreateExtension('vector'),
        migrations.CreateModel(
            name='SpedKnowledgeChunk',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('content', models.TextField(help_text='Curated text unit containing pedagogical guidance.')),
                ('domain', models.CharField(choices=[('Communication', 'Communication & Language'), ('Socialization', 'Socialization & Interpersonal'), ('Sensory_Motor', 'Sensory & Motor Integration'), ('Adaptive_Daily_Living', 'Adaptive & Daily Living Skills'), ('Behavioral', 'Behavioral & Emotional Self-Regulation'), ('Cognitive', 'Cognitive & Functional Academics')], max_length=64)),
                ('category', models.CharField(choices=[('DepEd_Competency', 'DepEd Competency'), ('ASD_Intervention', 'ASD Intervention'), ('RGORI_Rubric', 'R-GORI Rubric'), ('Accommodation_Strategy', 'Accommodation Strategy')], max_length=64)),
                ('subcategory', models.CharField(help_text='Specific framework, e.g., PECS, TEACCH, SensoryDiet, PBIS', max_length=64)),
                ('target_age_group', models.CharField(choices=[('Early_Childhood', 'Early Childhood (Kindergarten)'), ('Elementary_Primary', 'Elementary Primary (Grades 1-3)'), ('Elementary_Intermediate', 'Elementary Intermediate (Grades 4-6)'), ('All_Elementary', 'All Elementary')], default='All_Elementary', max_length=32)),
                ('token_count', models.PositiveIntegerField()),
                ('embedding', pgvector.django.vector.VectorField(dimensions=1536, help_text='OpenAI text-embedding-3-small vector representation')),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'iep_management_spedknowledgechunk',
                'indexes': [pgvector.django.indexes.HnswIndex(ef_construction=64, fields=['embedding'], m=16, name='idx_sped_chunk_hnsw', opclasses=['vector_cosine_ops']), models.Index(fields=['domain', 'category', 'subcategory'], name='idx_sped_chunk_meta')],
            },
        ),
    ]
