import logging
from typing import Any, Dict, List, Optional
from django.db.models import Q
from pgvector.django import CosineDistance
from iep_management.embedding_service import EmbeddingService
from iep_management.models import SpedKnowledgeChunk

logger = logging.getLogger(__name__)

class SemanticRetrieverService:
    """
    Metadata-Partitioned Hybrid Semantic Retriever over SpedKnowledgeChunk.
    Retrieves authoritative DepEd and EBP context chunks using pgvector cosine distance.
    """
    DEFAULT_TOP_K = 4
    MAX_COSINE_DISTANCE = 0.35  # Similarity threshold >= 0.65
    
    # Domain normalization mapping
    DOMAIN_NORMALIZATION = {
        'communication': 'Communication',
        'speech': 'Communication',
        'language': 'Communication',
        'verbal': 'Communication',
        'socialization': 'Socialization',
        'social': 'Socialization',
        'interpersonal': 'Socialization',
        'sensory': 'Sensory_Motor',
        'sensory_motor': 'Sensory_Motor',
        'motor': 'Sensory_Motor',
        'fine_motor': 'Sensory_Motor',
        'gross_motor': 'Sensory_Motor',
        'adaptive': 'Adaptive_Daily_Living',
        'adaptive_daily_living': 'Adaptive_Daily_Living',
        'daily_living': 'Adaptive_Daily_Living',
        'life_skills': 'Adaptive_Daily_Living',
        'hygiene': 'Adaptive_Daily_Living',
        'toileting': 'Adaptive_Daily_Living',
        'behavioral': 'Behavioral',
        'behavior': 'Behavioral',
        'emotional': 'Behavioral',
        'regulation': 'Behavioral',
        'self_regulation': 'Behavioral',
        'cognitive': 'Cognitive',
        'academic': 'Cognitive',
        'academics': 'Cognitive',
        'math': 'Cognitive',
        'mathematics': 'Cognitive',
        'mathematical': 'Cognitive',
        'numeracy': 'Cognitive',
        'reading': 'Cognitive',
        'literacy': 'Cognitive',
        'writing': 'Cognitive',
    }

    @classmethod
    def normalize_domain(cls, domain_input: Optional[str]) -> str:
        if not domain_input:
            return 'Communication'
        cleaned = str(domain_input).strip().lower().replace('-', '_').replace(' ', '_')
        for key, val in cls.DOMAIN_NORMALIZATION.items():
            if key in cleaned:
                return val
        # Check against valid domain choices
        valid_choices = [c[0] for c in SpedKnowledgeChunk.DomainChoices.choices]
        for choice in valid_choices:
            if choice.lower() in cleaned:
                return choice
        return 'Communication'

    @classmethod
    def derive_age_group(cls, age: Optional[int] = None, grade: Optional[int] = None) -> str:
        """
        Maps learner age or grade to SpedKnowledgeChunk TargetAgeChoices:
        - Early_Childhood (age <= 5 or grade 0/Kindergarten)
        - Elementary_Primary (age 6-9 or grade 1-3)
        - Elementary_Intermediate (age >= 10 or grade 4-6)
        - Defaults to All_Elementary
        """
        if age is not None:
            try:
                age_val = int(age)
                if age_val <= 5:
                    return SpedKnowledgeChunk.TargetAgeChoices.EARLY_CHILDHOOD
                elif age_val <= 9:
                    return SpedKnowledgeChunk.TargetAgeChoices.ELEM_PRIMARY
                else:
                    return SpedKnowledgeChunk.TargetAgeChoices.ELEM_INTERMEDIATE
            except (ValueError, TypeError):
                pass

        if grade is not None:
            try:
                grade_val = int(grade)
                if grade_val == 0:
                    return SpedKnowledgeChunk.TargetAgeChoices.EARLY_CHILDHOOD
                elif 1 <= grade_val <= 3:
                    return SpedKnowledgeChunk.TargetAgeChoices.ELEM_PRIMARY
                elif grade_val >= 4:
                    return SpedKnowledgeChunk.TargetAgeChoices.ELEM_INTERMEDIATE
            except (ValueError, TypeError):
                pass

        return SpedKnowledgeChunk.TargetAgeChoices.ALL_ELEM

    @classmethod
    def retrieve_context(
        cls,
        domain: str,
        query_text: str,
        target_age_group: str = 'All_Elementary',
        top_k: int = DEFAULT_TOP_K,
        max_distance: float = MAX_COSINE_DISTANCE,
    ) -> List[Dict[str, Any]]:
        """
        Executes metadata-filtered hybrid vector search.
        Filters by domain and age group, evaluates cosine distance, and balances category diversity.
        """
        from django.db import connection
        try:
            if connection.vendor == 'postgresql':
                with connection.cursor() as cursor:
                    cursor.execute("SET LOCAL hnsw.ef_search = 40;")
        except Exception as ef_err:
            logger.debug("Could not set hnsw.ef_search: %s", ef_err)

        norm_domain = cls.normalize_domain(domain)
        query_text = (query_text or "").strip()
        if not query_text:
            query_text = f"DepEd SPED intervention and goals for {norm_domain}"

        # 1. Compute query vector
        query_vector = EmbeddingService.get_embedding(query_text, domain=norm_domain)

        # 2. Query candidates with metadata filtering
        age_filter = Q(target_age_group=target_age_group) | Q(target_age_group='All_Elementary')
        queryset = (
            SpedKnowledgeChunk.objects
            .filter(domain=norm_domain)
            .filter(age_filter)
            .annotate(distance=CosineDistance('embedding', query_vector))
            .order_by('distance')
        )

        candidate_list = list(queryset[: top_k * 3])

        # Fall back to whole domain if age group filtering returned too few chunks
        if len(candidate_list) < top_k:
            queryset = (
                SpedKnowledgeChunk.objects
                .filter(domain=norm_domain)
                .annotate(distance=CosineDistance('embedding', query_vector))
                .order_by('distance')
            )
            candidate_list = list(queryset[: top_k * 3])

        # If candidates exist within distance threshold, prioritize diversity
        filtered_candidates = [c for c in candidate_list if c.distance is not None and c.distance <= max_distance]
        if not filtered_candidates:
            # Relax threshold to guarantee context grounding rather than empty retrieval
            filtered_candidates = candidate_list[:top_k]

        selected_chunks = cls._select_diverse_chunks(filtered_candidates, top_k)

        # Format output dictionary
        results = []
        for c in selected_chunks:
            similarity = round(1.0 - float(c.distance), 4) if c.distance is not None else 0.85
            results.append({
                'id': str(c.id),
                'content': c.content,
                'domain': c.domain,
                'category': c.category,
                'subcategory': c.subcategory,
                'target_age_group': c.target_age_group,
                'token_count': c.token_count,
                'similarity': similarity,
                'metadata': c.metadata,
            })

        return results

    @classmethod
    def _select_diverse_chunks(
        cls, candidates: List[SpedKnowledgeChunk], top_k: int
    ) -> List[SpedKnowledgeChunk]:
        """
        Balances pedagogical representation:
        Attempts to select at least 1 DepEd Competency, 1 ASD Intervention, and 1 R-GORI/Accommodation chunk.
        """
        if len(candidates) <= top_k:
            return candidates

        selected = []
        seen_categories = set()

        # Pass 1: One per unique category
        for candidate in candidates:
            if candidate.category not in seen_categories:
                selected.append(candidate)
                seen_categories.add(candidate.category)
                if len(selected) == top_k:
                    return selected

        # Pass 2: Fill remainder by lowest cosine distance
        for candidate in candidates:
            if candidate not in selected:
                selected.append(candidate)
                if len(selected) == top_k:
                    break

        return selected

    @classmethod
    def format_context_for_prompt(cls, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Formats retrieved chunks into an immutable pedagogical knowledge base block for LLM prompts.
        """
        if not retrieved_chunks:
            return "No specific reference knowledge chunks retrieved. Apply general DepEd Region VII SPED standards."

        formatted_blocks = []
        for idx, chunk in enumerate(retrieved_chunks, start=1):
            category = chunk.get('category', 'Standard')
            subcategory = chunk.get('subcategory', 'Guideline')
            content = chunk.get('content', '').strip()
            formatted_blocks.append(
                f"[REFERENCE CHUNK #{idx} | {category} - {subcategory}]\n{content}"
            )

        return "\n\n".join(formatted_blocks)
