# 🔒 Student PII Encryption & Key Management Guide (RA 10173)

## Overview
Under the **Republic Act 10173 (Data Privacy Act of 2012)** compliance architecture, sensitive Special Education learner data is encrypted at rest using application-layer Fernet (AES-256) encryption.

Protected database fields on the `StudentProfile` model include:
- `name`: Student's full legal name
- `guardian_name`: Parent or legal guardian name
- `asdBackground`: Medical and educational developmental history
- `diagnosis`: Official clinical diagnosis details
- `assessmentResult`: Baseline psychoeducational assessment evaluations

---

## Shared Team Environments & Key Standardization

When multiple team members or deployment environments (Development, Staging, QA, Production) connect to the same PostgreSQL / Supabase database instance, **they must use the identical `STUDENT_PII_ENCRYPTION_KEY`**.

### Root Cause of Ciphertext Exposure (Issue #258)
If a student record is encrypted using Key A on one developer's machine and then retrieved on an environment running with Key B:
1. `Fernet.decrypt()` raises `cryptography.fernet.InvalidToken`.
2. Prior to the fix, the exception handler fell back to returning the raw database column (`gAAAAA...`), causing cryptographic ciphertext tokens to leak into frontend UI tables, cards, and API JSON payloads.
3. With the current implementation:
   - Decryption failures are trapped and logged at the `WARNING` level.
   - The field returns an `EncryptedValuePlaceholder` formatted as `[Encrypted Student #<id>]` or `[Encrypted Guardian #<id>]`.
   - Raw `gAAAAA...` Fernet tokens are **never** exposed to API consumers or frontend UI components.
   - The underlying raw ciphertext is preserved in memory so accidental ORM saves do not overwrite or destroy encrypted database records.

---

## Configuration

In `neuropath-backend/.env`:

```env
# Primary AES-256 Fernet Encryption Key
# Generate via: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
STUDENT_PII_ENCRYPTION_KEY=your-shared-fernet-key-here

# Optional: Comma-separated list of previous Fernet keys for zero-downtime rotation
STUDENT_PII_FALLBACK_ENCRYPTION_KEYS=key1,key2
```

> **Note:** If `STUDENT_PII_ENCRYPTION_KEY` is not provided, Django deterministically derives a fallback Fernet key from `SECRET_KEY` using SHA-256.

---

## Key Rotation & Re-Encryption Utility

When rotating encryption keys, NeuroPath provides a Django management command to decrypt stored records with previous keys and re-encrypt them under the active key:

```bash
cd neuropath-backend

# 1. Preview changes without writing to database
python manage.py reencrypt_student_pii --dry-run --old-key "<old-fernet-key>"

# 2. Perform re-encryption
python manage.py reencrypt_student_pii --old-key "<old-fernet-key>"

# 3. If records were encrypted under a previous Django SECRET_KEY:
python manage.py reencrypt_student_pii --old-secret "<previous-django-secret-key>"

# 4. Target a specific student ID:
python manage.py reencrypt_student_pii --student-id 7 --old-key "<old-fernet-key>"

# 5. Re-encrypt legacy unencrypted database rows:
python manage.py reencrypt_student_pii --reencrypt-legacy
```

---

## Architectural Guarantees
- **Never Leaks Ciphertext Tokens:** UI components, PDFs, and API endpoints always receive human-readable text or standardized placeholders (`[Encrypted Student #<id>]`).
- **Zero Double-Encryption:** Ciphertext strings starting with `gAAAAA` are guarded against redundant nested re-encryption.
- **Safe ORM Updates:** Saving an existing student model instance whose decryption failed will not corrupt the database with placeholder text.
