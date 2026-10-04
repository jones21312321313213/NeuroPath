import functools
import hashlib
import base64
from django.conf import settings
from django.db import models
from cryptography.fernet import Fernet, InvalidToken


@functools.lru_cache(maxsize=8)
def _get_fernet_for_key(key_str: str) -> Fernet:
    """Cache Fernet instances by key string."""
    return Fernet(key_str.encode('utf-8') if isinstance(key_str, str) else key_str)


def get_fernet() -> Fernet:
    """
    Retrieve the configured Fernet cipher instance.
    Uses settings.STUDENT_PII_ENCRYPTION_KEY if provided, otherwise
    derives a deterministic fallback key from settings.SECRET_KEY.
    """
    key = getattr(settings, 'STUDENT_PII_ENCRYPTION_KEY', None)
    if not key:
        secret = getattr(settings, 'SECRET_KEY', 'default-fernet-secret-fallback')
        digest = hashlib.sha256(secret.encode()).digest()
        key = base64.urlsafe_b64encode(digest).decode()
    return _get_fernet_for_key(str(key))


def _encrypt_value(value):
    """
    Encrypts plaintext using Fernet AES-256.
    Skips empty/None values and prevents double-encryption.
    """
    if value is None or value == '':
        return value
    str_val = str(value)
    fernet = get_fernet()

    # Guard against double encryption
    if str_val.startswith('gAAAAA'):
        try:
            fernet.decrypt(str_val.encode('utf-8'))
            return str_val
        except Exception:
            pass

    encrypted_bytes = fernet.encrypt(str_val.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')


def _decrypt_value(value):
    """
    Decrypts ciphertext using Fernet AES-256.
    Gracefully returns plaintext if unencrypted (legacy database rows)
    or if decryption token is invalid.
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
    except (InvalidToken, Exception):
        # Fallback to stored value if decryption fails
        return value


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
        value = super().get_prep_value(value)
        return _encrypt_value(value)

    def from_db_value(self, value, expression, connection):
        return _decrypt_value(value)

    def to_python(self, value):
        val = super().to_python(value)
        return _decrypt_value(val)


class EncryptedTextField(models.TextField):
    """
    TextField with transparent application-layer Fernet (AES-256) encryption at rest.
    Plaintext in memory / serializers / views, ciphertext in database column.
    """
    description = "Fernet (AES-256) encrypted TextField"

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        return _encrypt_value(value)

    def from_db_value(self, value, expression, connection):
        return _decrypt_value(value)

    def to_python(self, value):
        val = super().to_python(value)
        return _decrypt_value(val)
