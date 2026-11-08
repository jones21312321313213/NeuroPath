from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import connection, transaction
from cryptography.fernet import Fernet, InvalidToken
from users.fields import get_fernet, derive_fernet_key, _get_fernet_for_key

ENCRYPTED_FIELDS = [
    'name',
    'guardian_name',
    'asdBackground',
    'diagnosis',
    'assessmentResult'
]


class Command(BaseCommand):
    help = (
        "Re-encrypts student PII fields (name, guardian_name, asdBackground, diagnosis, assessmentResult) "
        "when rotating keys or reconciling ciphertext across environments."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--old-key',
            action='append',
            dest='old_keys',
            default=[],
            help='Previous Fernet key used to encrypt the records. Can be specified multiple times.',
        )
        parser.add_argument(
            '--old-secret',
            action='append',
            dest='old_secrets',
            default=[],
            help='Previous Django SECRET_KEY (will be derived into a Fernet key via SHA-256).',
        )
        parser.add_argument(
            '--new-key',
            dest='new_key',
            default=None,
            help='New Fernet key to re-encrypt records with. Defaults to current active key in settings.',
        )
        parser.add_argument(
            '--student-id',
            type=int,
            dest='student_id',
            default=None,
            help='Re-encrypt only a specific student ID.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            dest='dry_run',
            default=False,
            help='Simulate re-encryption and print report without committing changes to database.',
        )
        parser.add_argument(
            '--reencrypt-legacy',
            action='store_true',
            dest='reencrypt_legacy',
            default=False,
            help='Also encrypt legacy plaintext records that do not start with gAAAAA.',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            dest='force',
            default=False,
            help='Force re-encryption even for records already decryptable with the new key.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        reencrypt_legacy = options['reencrypt_legacy']
        force = options['force']
        target_student_id = options['student_id']

        # Determine target new Fernet cipher
        new_key_str = options['new_key']
        if new_key_str:
            try:
                new_fernet = Fernet(new_key_str.encode('utf-8'))
            except Exception as e:
                raise CommandError(f"Invalid --new-key provided: {e}")
        else:
            primary_key = getattr(settings, 'STUDENT_PII_ENCRYPTION_KEY', None)
            if not primary_key:
                secret = getattr(settings, 'SECRET_KEY', 'default-fernet-secret-fallback')
                primary_key = derive_fernet_key(secret)
            try:
                new_fernet = Fernet(primary_key.encode('utf-8'))
            except Exception as e:
                raise CommandError(f"Unable to initialize Fernet with active setting key: {e}")

        # Collect candidate decryption keys (in order of priority)
        candidate_fernet_instances = []

        # Current multi-fernet keys from get_fernet()
        active_mf = get_fernet()
        for f in getattr(active_mf, '_fernets', []):
            if f not in candidate_fernet_instances:
                candidate_fernet_instances.append(f)

        # Explicitly passed old keys
        for ok in options['old_keys']:
            try:
                f = _get_fernet_for_key(ok.strip())
                if f not in candidate_fernet_instances:
                    candidate_fernet_instances.append(f)
            except Exception as e:
                self.stderr.write(self.style.WARNING(f"Ignoring invalid old key '{ok}': {e}"))

        # Explicitly passed old secrets
        for os in options['old_secrets']:
            try:
                derived = derive_fernet_key(os.strip())
                f = _get_fernet_for_key(derived)
                if f not in candidate_fernet_instances:
                    candidate_fernet_instances.append(f)
            except Exception as e:
                self.stderr.write(self.style.WARNING(f"Ignoring invalid old secret '{os}': {e}"))

        self.stdout.write(self.style.MIGRATE_HEADING("=== NeuroPath PII Re-Encryption Utility ==="))
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY-RUN MODE: No database modifications will be saved.\n"))

        # Fetch records using direct raw cursor to inspect true stored database ciphertext
        columns = ['studentID'] + ENCRYPTED_FIELDS
        quoted_cols = ', '.join([f'"{col}"' for col in columns])
        query = f'SELECT {quoted_cols} FROM "users_studentprofile"'
        params = []
        if target_student_id:
            query += ' WHERE "studentID" = %s'
            params.append(target_student_id)
        query += ' ORDER BY "studentID" ASC'

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()

        total_students = len(rows)
        total_fields_inspected = 0
        total_fields_reencrypted = 0
        total_fields_skipped = 0
        total_fields_failed = 0
        students_modified = 0

        updates_by_student = []

        for row in rows:
            student_id = row[0]
            field_values = dict(zip(ENCRYPTED_FIELDS, row[1:]))
            student_updates = {}
            has_failure = False

            for field_name in ENCRYPTED_FIELDS:
                raw_val = field_values.get(field_name)
                if raw_val is None or raw_val == '':
                    continue

                total_fields_inspected += 1
                raw_str = str(raw_val)

                if raw_str.startswith('gAAAAA'):
                    # Check if already decryptable with new key
                    already_matches_new_key = False
                    try:
                        plaintext = new_fernet.decrypt(raw_str.encode('utf-8')).decode('utf-8')
                        already_matches_new_key = True
                    except (InvalidToken, Exception):
                        already_matches_new_key = False

                    if already_matches_new_key and not force:
                        total_fields_skipped += 1
                        continue

                    # Attempt decryption across candidate keys
                    decrypted_text = None
                    if already_matches_new_key and force:
                        decrypted_text = plaintext
                    else:
                        for cand in candidate_fernet_instances:
                            try:
                                decrypted_text = cand.decrypt(raw_str.encode('utf-8')).decode('utf-8')
                                break
                            except (InvalidToken, Exception):
                                continue

                    if decrypted_text is not None:
                        new_ct = new_fernet.encrypt(decrypted_text.encode('utf-8')).decode('utf-8')
                        student_updates[field_name] = new_ct
                        total_fields_reencrypted += 1
                    else:
                        total_fields_failed += 1
                        has_failure = True
                        self.stderr.write(
                            self.style.ERROR(
                                f"  [FAIL] Student #{student_id} field '{field_name}': "
                                f"Token starting with '{raw_str[:12]}...' could not be decrypted with any key."
                            )
                        )
                else:
                    # Legacy plaintext
                    if reencrypt_legacy:
                        new_ct = new_fernet.encrypt(raw_str.encode('utf-8')).decode('utf-8')
                        student_updates[field_name] = new_ct
                        total_fields_reencrypted += 1
                    else:
                        total_fields_skipped += 1

            if student_updates:
                students_modified += 1
                updates_by_student.append((student_id, student_updates))

        # Commit updates
        if updates_by_student and not dry_run:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    for student_id, fields_to_update in updates_by_student:
                        set_clause = ', '.join([f'"{f}" = %s' for f in fields_to_update.keys()])
                        update_sql = f'UPDATE "users_studentprofile" SET {set_clause} WHERE "studentID" = %s'
                        update_params = list(fields_to_update.values()) + [student_id]
                        cursor.execute(update_sql, update_params)
            self.stdout.write(self.style.SUCCESS(f"Successfully committed updates for {students_modified} students."))
        elif dry_run:
            self.stdout.write(self.style.WARNING(f"DRY-RUN completed: {students_modified} students would be updated."))

        self.stdout.write("\nSummary:")
        self.stdout.write(f"  Total students scanned:        {total_students}")
        self.stdout.write(f"  Total fields inspected:       {total_fields_inspected}")
        self.stdout.write(f"  Fields re-encrypted:          {total_fields_reencrypted}")
        self.stdout.write(f"  Fields skipped (already valid): {total_fields_skipped}")
        self.stdout.write(f"  Fields failed decryption:     {total_fields_failed}")

        if total_fields_failed > 0:
            self.stdout.write(
                self.style.NOTICE(
                    "\nTip: If some records failed decryption, supply their original encryption key via "
                    "--old-key <fernet-key> or --old-secret <django-secret-key>."
                )
            )
