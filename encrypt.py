import os
import base64
import sys
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from hashlib import md5

# Provided by Sigma Support Agent

def passphrase_to_key(data, salt):
    """
    Converts a passphrase to a key using md5 and a salt.
    Returns the key and an iv.
    """
    key_iv_size = 32 + 16
    assert len(salt) == 8, len(salt)
    data += salt
    key = md5(data).digest()
    final_key = key
    while len(final_key) < key_iv_size:
        key = md5(key + data).digest()
        final_key += key
    return final_key[:key_iv_size]


def encrypt(data_string, passphrase_string):
    """
    Encrypts a string using AES-256-CBC with PKCS7 padding.
    Converts the passphrase to a key using md5 and a salt.
    Returns the encrypted string as a base64 encoded string.
    """
    data = data_string.encode("utf-8")
    passphrase = passphrase_string.encode("utf-8")
    salt = os.urandom(8)
    key_iv = passphrase_to_key(passphrase, salt)
    key = key_iv[:32]
    iv = key_iv[32:]
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    pkcs7_padder = padding.PKCS7(128).padder()
    encrypted = (
        encryptor.update(pkcs7_padder.update(data) + pkcs7_padder.finalize())
        + encryptor.finalize()
    )

    cipherbyte = base64.b64encode(b"Salted__" + salt + encrypted)
    return cipherbyte.decode("utf-8")

print(encrypt(sys.argv[1], sys.argv[2]))