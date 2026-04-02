"""
Bug condition exploration tests for bcrypt 72-byte password truncation bugfix.

This test suite validates that the bug exists: passwords longer than 72 bytes
fail during registration with a bcrypt error.

**Validates: Requirements 2.1**
"""

import pytest
from hypothesis import given, strategies as st, settings
from app.core.security import hash_password, verify_password


class TestBcrypt72BytePasswordBugCondition:
    """
    Bug condition exploration tests for bcrypt 72-byte password truncation.
    
    These tests confirm the bug exists on unfixed code: when a user attempts
    to register with a password longer than 72 bytes, the system raises a
    bcrypt error and registration fails.
    
    EXPECTED OUTCOME: These tests FAIL on unfixed code (this is correct - 
    it proves the bug exists). When the fix is implemented, these tests 
    will PASS.
    """

    def test_hash_password_with_100_byte_password(self):
        """
        Test: hash_password() with 100-byte password should succeed.
        
        When a user registers with a password of 100 bytes, the system
        SHALL truncate the password to 72 bytes and successfully hash it.
        
        EXPECTED ON UNFIXED CODE: Raises ValueError with message about
        72-byte limit (this confirms the bug exists).
        
        EXPECTED ON FIXED CODE: Returns a valid bcrypt hash.
        
        **Validates: Requirements 2.1**
        """
        password = "a" * 100
        
        # This should succeed after fix (truncate to 72 bytes)
        # This should fail on unfixed code with bcrypt error
        hashed = hash_password(password)
        
        # Verify the hash is a valid bcrypt hash (starts with $2)
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the hash can be verified with the original password
        assert verify_password(password, hashed) is True

    def test_hash_password_with_exactly_72_byte_password(self):
        """
        Test: hash_password() with exactly 72-byte password should succeed.
        
        When a user registers with a password of exactly 72 bytes, the system
        SHALL successfully hash it without modification.
        
        EXPECTED ON BOTH UNFIXED AND FIXED CODE: Returns a valid bcrypt hash.
        
        **Validates: Requirements 2.1**
        """
        password = "d" * 72
        
        # This should succeed on both unfixed and fixed code
        hashed = hash_password(password)
        
        # Verify the hash is a valid bcrypt hash (starts with $2)
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the hash can be verified with the original password
        assert verify_password(password, hashed) is True

    def test_hash_password_with_short_password(self):
        """
        Test: hash_password() with short password should succeed.
        
        When a user registers with a password shorter than 72 bytes, the system
        SHALL successfully hash it without modification.
        
        EXPECTED ON BOTH UNFIXED AND FIXED CODE: Returns a valid bcrypt hash.
        
        **Validates: Requirements 2.1**
        """
        password = "mypassword"
        
        # This should succeed on both unfixed and fixed code
        hashed = hash_password(password)
        
        # Verify the hash is a valid bcrypt hash (starts with $2)
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the hash can be verified with the original password
        assert verify_password(password, hashed) is True



class TestBcrypt72BytePasswordPreservation:
    """
    Preservation property tests for bcrypt 72-byte password truncation.
    
    These tests verify that existing behavior is preserved for passwords ≤72 bytes.
    They capture the baseline behavior on unfixed code and ensure it continues
    after the fix is implemented.
    
    EXPECTED OUTCOME: These tests PASS on unfixed code (confirming baseline behavior).
    These tests MUST continue to PASS after the fix (confirming no regressions).
    
    **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    """

    @settings(max_examples=10)
    @given(st.text(min_size=0, max_size=72))
    def test_short_passwords_hash_and_verify_successfully(self, password):
        """
        Property: For any password ≤72 bytes, hash_password() and verify_password()
        work correctly.
        
        This property tests that passwords up to 72 bytes can be hashed and verified
        successfully, preserving the baseline behavior for non-buggy inputs.
        
        **Validates: Requirements 3.3, 3.4**
        """
        # Hash the password
        hashed = hash_password(password)
        
        # Verify the hash is a valid bcrypt hash
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the password matches the hash
        assert verify_password(password, hashed) is True

    @settings(max_examples=10)
    @given(st.text(min_size=0, max_size=72))
    def test_incorrect_passwords_are_rejected(self, password):
        """
        Property: For any password ≤72 bytes, incorrect passwords are always rejected.
        
        This property tests that verify_password() correctly rejects passwords that
        don't match the hash, preserving the baseline behavior for password verification.
        
        **Validates: Requirements 3.4**
        """
        # Hash the password
        hashed = hash_password(password)
        
        # Create an incorrect password (append a character to make it different)
        incorrect_password = password + "X"
        
        # Verify the incorrect password is rejected
        assert verify_password(incorrect_password, hashed) is False

    @settings(max_examples=10)
    @given(st.text(min_size=0, max_size=72))
    def test_empty_and_short_passwords_work(self, password):
        """
        Property: For any password from empty to 72 bytes, hashing and verification work.
        
        This property specifically tests edge cases including empty passwords and
        very short passwords, ensuring they continue to work after the fix.
        
        **Validates: Requirements 3.3, 3.4**
        """
        # Hash the password (including empty string)
        hashed = hash_password(password)
        
        # Verify it's a valid hash
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the password matches
        assert verify_password(password, hashed) is True

    def test_exactly_72_byte_password_works(self):
        """
        Test: Exactly 72-byte password should hash and verify correctly.
        
        This test verifies the boundary case where password is exactly 72 bytes,
        ensuring it works correctly and is not truncated.
        
        **Validates: Requirements 3.2, 3.3**
        """
        password = "a" * 72
        
        # Hash the password
        hashed = hash_password(password)
        
        # Verify the hash is valid
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the password matches
        assert verify_password(password, hashed) is True

    def test_one_byte_password_works(self):
        """
        Test: One-byte password should hash and verify correctly.
        
        This test verifies the edge case of a single-character password.
        
        **Validates: Requirements 3.3, 3.4**
        """
        password = "a"
        
        # Hash the password
        hashed = hash_password(password)
        
        # Verify the hash is valid
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the password matches
        assert verify_password(password, hashed) is True

    def test_empty_password_works(self):
        """
        Test: Empty password should hash and verify correctly.
        
        This test verifies the edge case of an empty password.
        
        **Validates: Requirements 3.3, 3.4**
        """
        password = ""
        
        # Hash the password
        hashed = hash_password(password)
        
        # Verify the hash is valid
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the password matches
        assert verify_password(password, hashed) is True

    def test_special_characters_password_works(self):
        """
        Test: Password with special characters should hash and verify correctly.
        
        This test verifies that special characters are handled correctly.
        
        **Validates: Requirements 3.3, 3.4**
        """
        password = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`"
        
        # Hash the password
        hashed = hash_password(password)
        
        # Verify the hash is valid
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the password matches
        assert verify_password(password, hashed) is True

    def test_unicode_password_works(self):
        """
        Test: Password with unicode characters should hash and verify correctly.
        
        This test verifies that unicode characters are handled correctly.
        Note: Unicode characters may take multiple bytes when encoded as UTF-8.
        
        **Validates: Requirements 3.3, 3.4**
        """
        # Use unicode characters that fit within 72 bytes when UTF-8 encoded
        password = "café_日本語_🔐"
        
        # Verify the password is within 72 bytes when UTF-8 encoded
        assert len(password.encode('utf-8')) <= 72
        
        # Hash the password
        hashed = hash_password(password)
        
        # Verify the hash is valid
        assert hashed is not None
        assert hashed.startswith("$2")
        
        # Verify the password matches
        assert verify_password(password, hashed) is True

    @settings(max_examples=10)
    @given(st.text(min_size=1, max_size=72))
    def test_login_verification_works_for_short_passwords(self, password):
        """
        Property: For any password ≤72 bytes, login verification works correctly.
        
        This property tests the full login flow: hash a password during registration,
        then verify it during login. This ensures the login verification logic
        continues to work correctly after the fix.
        
        **Validates: Requirements 3.1, 3.2**
        """
        # Simulate registration: hash the password
        hashed = hash_password(password)
        
        # Simulate login: verify the password
        assert verify_password(password, hashed) is True
        
        # Verify that a different password fails
        different_password = password + "X" if password else "X"
        assert verify_password(different_password, hashed) is False
