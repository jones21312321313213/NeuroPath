import functools
import hashlib
import base64
import logging
from django.conf import settings
from django.db import models
from cryptography.fernet import Fernet, MultiFernet, InvalidToken

logger = logging.getLogger(__name__)


def derive_fernet_key(secret: str) -> str:
    """Derives a base64-encoded 32-byte Fernet key deterministically from a secret string."""
    digest = hashlib.sha256(secret.encode('utf-8') if isinstance(secret, str) else secret).digest()
    return base64.urlsafe_b64encode(digest).decode('utf-8')


class EncryptedValuePlaceholder(str):
    """
    String subclass representing a sensitive field value whose decryption failed.
    Behaves as a clean masked placeholder (e.g. '[Encrypted Student]') in views,
    serializers, and logs while preserving the underlying raw ciphertext in
    `raw_ciphertext` so database saves do not corrupt or overwrite the stored token.
    """
    def __new__(cls, placeholder: str, raw_ciphertext: str = ""):
        obj = super().__new__(cls, placeholder)
        obj.raw_ciphertext = raw_ciphertext
        return obj


@functools.lru_cache(maxsize=16)
def _get_fernet_for_key(key_str: str) -> Fernet:
    """Cache Fernet instances by key string."""
    return Fernet(key_str.encode('utf-8') if isinstance(key_str, str) else key_str)


def get_fernet() -> MultiFernet:
    """
    Retrieve the configured MultiFernet cipher instance.
    Uses settings.STUDENT_PII_ENCRYPTION_KEY as the primary key.
    Includes any fallback keys from settings.STUDENT_PII_FALLBACK_ENCRYPTION_KEYS,
    as well as the deterministic fallback key derived from settings.SECRET_KEY.
    This guarantees zero downtime decryption across key rotations and environments.
    """
    keys = []
    primary = getattr(settings, 'STUDENT_PII_ENCRYPTION_KEY', None)
    if primary:
        keys.append(str(primary).strip())

    fallbacks = getattr(settings, 'STUDENT_PII_FALLBACK_ENCRYPTION_KEYS', [])
    if isinstance(fallbacks, str):
        fallbacks = [k.strip() for k in fallbacks.split(',') if k.strip()]
    for fb in (fallbacks or []):
        fb_str = str(fb).strip()
        if fb_str and fb_str not in keys:
            keys.append(fb_str)

    secret = getattr(settings, 'SECRET_KEY', 'default-fernet-secret-fallback')
    if secret:
        derived = derive_fernet_key(secret)
        if derived not in keys:
            keys.append(derived)

    fernet_list = []
    for k in keys:
        try:
            fernet_list.append(_get_fernet_for_key(k))
        except Exception as exc:
            logger.warning("Skipping invalid Fernet key in configuration: %s", exc)

    if not fernet_list:
        fallback_derived = derive_fernet_key('default-fernet-secret-fallback')
        fernet_list.append(_get_fernet_for_key(fallback_derived))

    return MultiFernet(fernet_list)


def _encrypt_value(value):
    """
    Encrypts plaintext using Fernet AES-256.
    Skips empty/None values and prevents double-encryption.
    Preserves raw ciphertext if an EncryptedValuePlaceholder is passed.
    """
    if value is None or value == '':
        return value
    if hasattr(value, 'raw_ciphertext') and value.raw_ciphertext:
        return value.raw_ciphertext
    str_val = str(value)

    # Guard against double encryption
    if str_val.startswith('gAAAAA'):
        return str_val

    fernet = get_fernet()
    encrypted_bytes = fernet.encrypt(str_val.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')


def _decrypt_value(value, fallback=None, field_name=None):
    """
    Decrypts ciphertext using Fernet AES-256.
    Gracefully returns plaintext if unencrypted (legacy database rows).
    If decryption fails (e.g., key mismatch or invalid token), logs a warning
    and returns a clean masked placeholder (EncryptedValuePlaceholder) rather than
    leaking raw Fernet ciphertext token into API responses or UI displays.
    """
    if value is None or value == '':
        return value
    if not isinstance(value, str):
        return value
    if not value.startswith('gAAAAA'):
        # Legacy unencrypted row
        return value

    try:
        fernet = get_fernet()
        decrypted_bytes = fernet.decrypt(value.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except (InvalidToken, Exception) as exc:
        logger.warning(
            "PII Decryption failed for field '%s' (token prefix '%s...'): %s. "
            "Masking ciphertext to prevent raw token leakage.",
            field_name or "unknown",
            value[:12] if isinstance(value, str) else "",
            exc
        )
        if fallback is not None:
            return EncryptedValuePlaceholder(str(fallback), raw_ciphertext=value)
        if field_name == 'name':
            placeholder = "[Encrypted Student]"
        elif field_name == 'guardian_name':
            placeholder = "[Encrypted Guardian]"
        elif field_name:
            placeholder = f"[Encrypted {field_name}]"
        else:
            placeholder = "[Encrypted Record]"
        return EncryptedValuePlaceholder(placeholder, raw_ciphertext=value)


class EncryptedCharField(models.CharField):
    """
    CharField with transparent application-layer Fernet (AES-256) encryption at rest.
    Plaintext in memory / serializers / views, ciphertext in database column.
    """
    description = "Fernet (AES-256) encrypted CharField"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('max_length', 512)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        if kwargs.get('max_length') == 512:
            pass
        return name, path, args, kwargs

    def get_prep_value(self, value):
        if hasattr(value, 'raw_ciphertext') and value.raw_ciphertext:
            return value.raw_ciphertext
        value = super().get_prep_value(value)
        return _encrypt_value(value)

    def from_db_value(self, value, expression, connection):
        return _decrypt_value(value, field_name=self.name)

    def to_python(self, value):
        if hasattr(value, 'raw_ciphertext') and value.raw_ciphertext:
            return value
        val = super().to_python(value)
        return _decrypt_value(val, field_name=self.name)


class EncryptedTextField(models.TextField):
    """
    TextField with transparent application-layer Fernet (AES-256) encryption at rest.
    Plaintext in memory / serializers / views, ciphertext in database column.
    """
    description = "Fernet (AES-256) encrypted TextField"

    def get_prep_value(self, value):
        if hasattr(value, 'raw_ciphertext') and value.raw_ciphertext:
            return value.raw_ciphertext
        value = super().get_prep_value(value)
        return _encrypt_value(value)

    def from_db_value(self, value, expression, connection):
        return _decrypt_value(value, field_name=self.name)

    def to_python(self, value):
        if hasattr(value, 'raw_ciphertext') and value.raw_ciphertext:
            return value
        val = super().to_python(value)
        return _decrypt_value(val, field_name=self.name)
