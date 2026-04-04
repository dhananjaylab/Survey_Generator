"""
Tests for Settings class validation methods.

This test suite validates the configuration validation utility methods
that are used by Pydantic field validators.

**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
"""

import pytest
from hypothesis import given, strategies as st, settings as hypothesis_settings
from app.core.config import Settings


class TestValidateTemperature:
    """Unit tests for validate_temperature() method."""

    def test_valid_temperature_at_minimum(self):
        """Test: validate_temperature() accepts -2.0 (minimum valid value)."""
        result = Settings.validate_temperature(-2.0)
        assert result == -2.0

    def test_valid_temperature_at_maximum(self):
        """Test: validate_temperature() accepts 2.0 (maximum valid value)."""
        result = Settings.validate_temperature(2.0)
        assert result == 2.0

    def test_valid_temperature_zero(self):
        """Test: validate_temperature() accepts 0.0."""
        result = Settings.validate_temperature(0.0)
        assert result == 0.0

    def test_valid_temperature_positive(self):
        """Test: validate_temperature() accepts positive values within range."""
        result = Settings.validate_temperature(1.5)
        assert result == 1.5

    def test_valid_temperature_negative(self):
        """Test: validate_temperature() accepts negative values within range."""
        result = Settings.validate_temperature(-1.5)
        assert result == -1.5

    def test_valid_temperature_integer(self):
        """Test: validate_temperature() accepts integers within range."""
        result = Settings.validate_temperature(1)
        assert result == 1.0

    def test_invalid_temperature_too_high(self):
        """Test: validate_temperature() rejects values above 2.0."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_temperature(2.1)
        assert "between -2.0 and 2.0" in str(exc_info.value)

    def test_invalid_temperature_too_low(self):
        """Test: validate_temperature() rejects values below -2.0."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_temperature(-2.1)
        assert "between -2.0 and 2.0" in str(exc_info.value)

    def test_invalid_temperature_string(self):
        """Test: validate_temperature() rejects non-numeric types."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_temperature("1.0")
        assert "must be a number" in str(exc_info.value)

    def test_invalid_temperature_none(self):
        """Test: validate_temperature() rejects None."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_temperature(None)
        assert "must be a number" in str(exc_info.value)

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=-2.0, max_value=2.0, allow_nan=False, allow_infinity=False))
    def test_valid_temperature_property(self, temp):
        """Property: validate_temperature() accepts all values in [-2.0, 2.0].
        
        **Validates: Requirements 15.1**
        """
        result = Settings.validate_temperature(temp)
        assert result == temp

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=2.1, max_value=100.0, allow_nan=False, allow_infinity=False))
    def test_invalid_temperature_too_high_property(self, temp):
        """Property: validate_temperature() rejects all values > 2.0.
        
        **Validates: Requirements 15.1**
        """
        with pytest.raises(ValueError):
            Settings.validate_temperature(temp)

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=-100.0, max_value=-2.1, allow_nan=False, allow_infinity=False))
    def test_invalid_temperature_too_low_property(self, temp):
        """Property: validate_temperature() rejects all values < -2.0.
        
        **Validates: Requirements 15.1**
        """
        with pytest.raises(ValueError):
            Settings.validate_temperature(temp)


class TestValidateTopP:
    """Unit tests for validate_top_p() method."""

    def test_valid_top_p_at_minimum(self):
        """Test: validate_top_p() accepts 0.0 (minimum valid value)."""
        result = Settings.validate_top_p(0.0)
        assert result == 0.0

    def test_valid_top_p_at_maximum(self):
        """Test: validate_top_p() accepts 1.0 (maximum valid value)."""
        result = Settings.validate_top_p(1.0)
        assert result == 1.0

    def test_valid_top_p_middle(self):
        """Test: validate_top_p() accepts 0.5."""
        result = Settings.validate_top_p(0.5)
        assert result == 0.5

    def test_valid_top_p_integer(self):
        """Test: validate_top_p() accepts integers within range."""
        result = Settings.validate_top_p(1)
        assert result == 1.0

    def test_invalid_top_p_too_high(self):
        """Test: validate_top_p() rejects values above 1.0."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_top_p(1.1)
        assert "between 0.0 and 1.0" in str(exc_info.value)

    def test_invalid_top_p_too_low(self):
        """Test: validate_top_p() rejects values below 0.0."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_top_p(-0.1)
        assert "between 0.0 and 1.0" in str(exc_info.value)

    def test_invalid_top_p_string(self):
        """Test: validate_top_p() rejects non-numeric types."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_top_p("0.5")
        assert "must be a number" in str(exc_info.value)

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False))
    def test_valid_top_p_property(self, top_p):
        """Property: validate_top_p() accepts all values in [0.0, 1.0].
        
        **Validates: Requirements 15.2**
        """
        result = Settings.validate_top_p(top_p)
        assert result == top_p

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=1.1, max_value=100.0, allow_nan=False, allow_infinity=False))
    def test_invalid_top_p_too_high_property(self, top_p):
        """Property: validate_top_p() rejects all values > 1.0.
        
        **Validates: Requirements 15.2**
        """
        with pytest.raises(ValueError):
            Settings.validate_top_p(top_p)

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=-100.0, max_value=-0.1, allow_nan=False, allow_infinity=False))
    def test_invalid_top_p_too_low_property(self, top_p):
        """Property: validate_top_p() rejects all values < 0.0.
        
        **Validates: Requirements 15.2**
        """
        with pytest.raises(ValueError):
            Settings.validate_top_p(top_p)


class TestValidatePenalty:
    """Unit tests for validate_penalty() method."""

    def test_valid_penalty_at_minimum(self):
        """Test: validate_penalty() accepts -2.0 (minimum valid value)."""
        result = Settings.validate_penalty(-2.0)
        assert result == -2.0

    def test_valid_penalty_at_maximum(self):
        """Test: validate_penalty() accepts 2.0 (maximum valid value)."""
        result = Settings.validate_penalty(2.0)
        assert result == 2.0

    def test_valid_penalty_zero(self):
        """Test: validate_penalty() accepts 0.0."""
        result = Settings.validate_penalty(0.0)
        assert result == 0.0

    def test_valid_penalty_positive(self):
        """Test: validate_penalty() accepts positive values within range."""
        result = Settings.validate_penalty(1.5)
        assert result == 1.5

    def test_valid_penalty_negative(self):
        """Test: validate_penalty() accepts negative values within range."""
        result = Settings.validate_penalty(-1.5)
        assert result == -1.5

    def test_valid_penalty_integer(self):
        """Test: validate_penalty() accepts integers within range."""
        result = Settings.validate_penalty(1)
        assert result == 1.0

    def test_invalid_penalty_too_high(self):
        """Test: validate_penalty() rejects values above 2.0."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_penalty(2.1)
        assert "between -2.0 and 2.0" in str(exc_info.value)

    def test_invalid_penalty_too_low(self):
        """Test: validate_penalty() rejects values below -2.0."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_penalty(-2.1)
        assert "between -2.0 and 2.0" in str(exc_info.value)

    def test_invalid_penalty_string(self):
        """Test: validate_penalty() rejects non-numeric types."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_penalty("1.0")
        assert "must be a number" in str(exc_info.value)

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=-2.0, max_value=2.0, allow_nan=False, allow_infinity=False))
    def test_valid_penalty_property(self, penalty):
        """Property: validate_penalty() accepts all values in [-2.0, 2.0].
        
        **Validates: Requirements 15.3**
        """
        result = Settings.validate_penalty(penalty)
        assert result == penalty

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=2.1, max_value=100.0, allow_nan=False, allow_infinity=False))
    def test_invalid_penalty_too_high_property(self, penalty):
        """Property: validate_penalty() rejects all values > 2.0.
        
        **Validates: Requirements 15.3**
        """
        with pytest.raises(ValueError):
            Settings.validate_penalty(penalty)

    @hypothesis_settings(max_examples=50)
    @given(st.floats(min_value=-100.0, max_value=-2.1, allow_nan=False, allow_infinity=False))
    def test_invalid_penalty_too_low_property(self, penalty):
        """Property: validate_penalty() rejects all values < -2.0.
        
        **Validates: Requirements 15.3**
        """
        with pytest.raises(ValueError):
            Settings.validate_penalty(penalty)


class TestValidateLogLevel:
    """Unit tests for validate_log_level() method."""

    def test_valid_log_level_debug(self):
        """Test: validate_log_level() accepts DEBUG."""
        result = Settings.validate_log_level("DEBUG")
        assert result == "DEBUG"

    def test_valid_log_level_info(self):
        """Test: validate_log_level() accepts INFO."""
        result = Settings.validate_log_level("INFO")
        assert result == "INFO"

    def test_valid_log_level_warning(self):
        """Test: validate_log_level() accepts WARNING."""
        result = Settings.validate_log_level("WARNING")
        assert result == "WARNING"

    def test_valid_log_level_error(self):
        """Test: validate_log_level() accepts ERROR."""
        result = Settings.validate_log_level("ERROR")
        assert result == "ERROR"

    def test_valid_log_level_critical(self):
        """Test: validate_log_level() accepts CRITICAL."""
        result = Settings.validate_log_level("CRITICAL")
        assert result == "CRITICAL"

    def test_valid_log_level_lowercase(self):
        """Test: validate_log_level() accepts lowercase and converts to uppercase."""
        result = Settings.validate_log_level("debug")
        assert result == "DEBUG"

    def test_valid_log_level_mixed_case(self):
        """Test: validate_log_level() accepts mixed case and converts to uppercase."""
        result = Settings.validate_log_level("InFo")
        assert result == "INFO"

    def test_invalid_log_level_unknown(self):
        """Test: validate_log_level() rejects unknown log levels."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_log_level("TRACE")
        assert "must be one of" in str(exc_info.value)

    def test_invalid_log_level_integer(self):
        """Test: validate_log_level() rejects non-string types."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_log_level(1)
        assert "must be a string" in str(exc_info.value)

    def test_invalid_log_level_none(self):
        """Test: validate_log_level() rejects None."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_log_level(None)
        assert "must be a string" in str(exc_info.value)

    @hypothesis_settings(max_examples=50)
    @given(st.sampled_from(["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]))
    def test_valid_log_level_property(self, level):
        """Property: validate_log_level() accepts all valid log levels.
        
        **Validates: Requirements 15.4**
        """
        result = Settings.validate_log_level(level)
        assert result == level

    @hypothesis_settings(max_examples=50)
    @given(st.sampled_from(["debug", "info", "warning", "error", "critical"]))
    def test_valid_log_level_lowercase_property(self, level):
        """Property: validate_log_level() accepts lowercase and converts to uppercase.
        
        **Validates: Requirements 15.4**
        """
        result = Settings.validate_log_level(level)
        assert result == level.upper()


class TestValidatePositiveInt:
    """Unit tests for validate_positive_int() method."""

    def test_valid_positive_int_one(self):
        """Test: validate_positive_int() accepts 1 (minimum positive integer)."""
        result = Settings.validate_positive_int(1)
        assert result == 1

    def test_valid_positive_int_large(self):
        """Test: validate_positive_int() accepts large positive integers."""
        result = Settings.validate_positive_int(1000000)
        assert result == 1000000

    def test_invalid_positive_int_zero(self):
        """Test: validate_positive_int() rejects 0."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_positive_int(0)
        assert "positive integer" in str(exc_info.value)

    def test_invalid_positive_int_negative(self):
        """Test: validate_positive_int() rejects negative integers."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_positive_int(-1)
        assert "positive integer" in str(exc_info.value)

    def test_invalid_positive_int_float(self):
        """Test: validate_positive_int() rejects floats."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_positive_int(1.5)
        assert "must be an integer" in str(exc_info.value)

    def test_invalid_positive_int_string(self):
        """Test: validate_positive_int() rejects strings."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_positive_int("1")
        assert "must be an integer" in str(exc_info.value)

    def test_invalid_positive_int_boolean(self):
        """Test: validate_positive_int() rejects booleans."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_positive_int(True)
        assert "must be an integer" in str(exc_info.value)

    def test_invalid_positive_int_none(self):
        """Test: validate_positive_int() rejects None."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_positive_int(None)
        assert "must be an integer" in str(exc_info.value)

    @hypothesis_settings(max_examples=50)
    @given(st.integers(min_value=1, max_value=1000000))
    def test_valid_positive_int_property(self, value):
        """Property: validate_positive_int() accepts all positive integers.
        
        **Validates: Requirements 15.5**
        """
        result = Settings.validate_positive_int(value)
        assert result == value

    @hypothesis_settings(max_examples=50)
    @given(st.integers(max_value=0))
    def test_invalid_positive_int_non_positive_property(self, value):
        """Property: validate_positive_int() rejects all non-positive integers.
        
        **Validates: Requirements 15.5**
        """
        with pytest.raises(ValueError):
            Settings.validate_positive_int(value)


class TestValidateNonEmptyString:
    """Unit tests for validate_non_empty_string() method."""

    def test_valid_non_empty_string_single_char(self):
        """Test: validate_non_empty_string() accepts single character strings."""
        result = Settings.validate_non_empty_string("a")
        assert result == "a"

    def test_valid_non_empty_string_normal(self):
        """Test: validate_non_empty_string() accepts normal strings."""
        result = Settings.validate_non_empty_string("hello")
        assert result == "hello"

    def test_valid_non_empty_string_with_spaces(self):
        """Test: validate_non_empty_string() accepts strings with spaces."""
        result = Settings.validate_non_empty_string("hello world")
        assert result == "hello world"

    def test_valid_non_empty_string_with_special_chars(self):
        """Test: validate_non_empty_string() accepts strings with special characters."""
        result = Settings.validate_non_empty_string("!@#$%^&*()")
        assert result == "!@#$%^&*()"

    def test_valid_non_empty_string_unicode(self):
        """Test: validate_non_empty_string() accepts unicode strings."""
        result = Settings.validate_non_empty_string("café")
        assert result == "café"

    def test_invalid_non_empty_string_empty(self):
        """Test: validate_non_empty_string() rejects empty strings."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_non_empty_string("")
        assert "non-empty string" in str(exc_info.value)

    def test_invalid_non_empty_string_whitespace_only(self):
        """Test: validate_non_empty_string() rejects whitespace-only strings."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_non_empty_string("   ")
        assert "non-empty string" in str(exc_info.value)

    def test_invalid_non_empty_string_integer(self):
        """Test: validate_non_empty_string() rejects non-string types."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_non_empty_string(123)
        assert "must be a string" in str(exc_info.value)

    def test_invalid_non_empty_string_none(self):
        """Test: validate_non_empty_string() rejects None."""
        with pytest.raises(ValueError) as exc_info:
            Settings.validate_non_empty_string(None)
        assert "must be a string" in str(exc_info.value)

    @hypothesis_settings(max_examples=50)
    @given(st.text(min_size=1).filter(lambda x: x.strip()))
    def test_valid_non_empty_string_property(self, value):
        """Property: validate_non_empty_string() accepts all non-empty strings.
        
        **Validates: Requirements 15.5**
        """
        result = Settings.validate_non_empty_string(value)
        assert result == value
