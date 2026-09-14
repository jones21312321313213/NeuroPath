import json
import math
import os
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from iep_management.models import SpedKnowledgeChunk
from iep_management.embedding_service import EmbeddingService


class Command(BaseCommand):
    help = "Seeds the SPED Knowledge Base into PostgreSQL with pgvector embeddings (Epic KAN-7 / KAN-8)."

    def add_arguments(self, parser):
        default_file = os.path.join(settings.BASE_DIR, 'iep_management', 'data', 'seed_sped_knowledge.json')
        parser.add_argument(
            '--file',
            type=str,
            default=default_file,
            help=f'Path to the curated seed JSON dataset (default: {default_file})'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing knowledge base chunks before seeding'
        )
        parser.add_argument(
            '--min-threshold',
            type=int,
            default=50,
            help='Minimum required chunks in database upon completion (default: 50)'
        )

    def _estimate_token_count(self, text: str) -> int:
        """Estimates token count for text using whitespace & punctuation heuristics (approx 1.3 tokens per word)."""
        words = text.split()
        return max(1, int(math.ceil(len(words) * 1.33)))

    def handle(self, *args, **options):
        file_path = options['file']
        clear_existing = options['clear']

        if not os.path.exists(file_path):
            raise CommandError(f"Seed file does not exist: {file_path}")

        self.stdout.write(self.style.NOTICE(f"Reading seed dataset from: {file_path}"))
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            raise CommandError(f"Failed to parse seed JSON file: {e}")

        if not isinstance(data, list) or len(data) == 0:
            raise CommandError("Seed file must contain a non-empty list of chunk objects.")

        self.stdout.write(f"Found {len(data)} chunk(s) in seed file.")

        if clear_existing:
            deleted_count, _ = SpedKnowledgeChunk.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted_count} existing chunk(s)."))

        created_count = 0
        updated_count = 0

        for idx, item in enumerate(data, start=1):
            content = item.get('content', '').strip()
            domain = item.get('domain', '').strip()
            category = item.get('category', '').strip()
            subcategory = item.get('subcategory', '').strip()
            target_age_group = item.get('target_age_group', 'All_Elementary').strip()
            metadata = item.get('metadata', {})

            if not content or not domain or not category or not subcategory:
                self.stdout.write(self.style.WARNING(f"Skipping chunk #{idx} due to missing required fields."))
                continue

            token_count = self._estimate_token_count(content)
            # Generate 1536-dimension embedding
            embedding = EmbeddingService.get_embedding(content, domain=domain)

            # Idempotent match on domain + category + subcategory + target_age_group
            chunk, created = SpedKnowledgeChunk.objects.update_or_create(
                domain=domain,
                category=category,
                subcategory=subcategory,
                target_age_group=target_age_group,
                defaults={
                    'content': content,
                    'token_count': token_count,
                    'embedding': embedding,
                    'metadata': metadata,
                }
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

            if idx % 10 == 0 or idx == len(data):
                self.stdout.write(f"Processed {idx}/{len(data)} chunks...")

        total_in_db = SpedKnowledgeChunk.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"Seeding completed successfully! Created: {created_count}, Updated: {updated_count}. "
            f"Total chunks in database: {total_in_db}"
        ))

        min_threshold = options.get('min_threshold', 50)
        if total_in_db < min_threshold:
            raise CommandError(
                f"Knowledge base contains {total_in_db} chunks, which is below the minimum threshold of {min_threshold}."
            )
