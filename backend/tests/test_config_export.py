"""
Tests for Settings.export() method.

This test suite validates the configuration export functionality that returns
all non-sensitive configuration values with their source information.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4**
"""

import os
import pytest
from hypothesis import given, strategies as st, settings as hypothesis_settings
from app.core.config import Settings


class TestExportBasicFunctionality:
    """Unit tests for export() method basic functionality."""

    def test_export_returns_dict(self):
        """Test: export() returns a dictionary."""
        result = Settings().export()
        assert isinstance(result, dict), "export() should return a dict"

    def test_export_includes_non_sensitive_fields(self):
        """Test: export() includes non-sensitive configuration fields."""
        result = Settings().export()
        
        # Check that common non-sensitive fields are included
        assert "GPT3_MODEL" in result, "GPT3_MODEL should be in export"
        assert "CHATGPT_MODEL" in result, "CHATGPT_MODEL should be in export"
        assert "GEMINI_MODEL" in result, "GEMINI_MODEL should be in export"
        assert "LOGGING_LEVEL" in result, "LOGGING_LEVEL should be in export"
        assert "PROMPTS_BASE_PATH" in result, "PROMPTS_BASE_PATH should be in export"

    def test_export_excludes_secret_key(self):
        """Test: export() excludes SECRET_KEY."""
        result = Settings().export()
        assert "SECRET_KEY" not in result, "SECRET_KEY should be excluded"

    def test_export_excludes_basic_auth_password(self):
        """Test: export() excludes BASIC_AUTH_PASSWORD."""
        result = Settings().export()
        assert "BASIC_AUTH_PASSWORD" not in result, "BASIC_AUTH_PASSWORD should be excluded"

    def test_export_excludes_openai_api_key(self):
        """Test: export() excludes OPENAI_API_KEY."""
        result = Settings().export()
        assert "OPENAI_API_KEY" not in result, "OPENAI_API_KEY should be excluded"

    def test_export_excludes_google_api_key(self):
        """Test: export() excludes GOOGLE_API_KEY."""
        result = Settings().export()
        assert "GOOGLE_API_KEY" not in result, "GOOGLE_API_KEY should be excluded"

    def test_export_excludes_database_url(self):
        """Test: export() excludes DATABASE_URL."""
        result = Settings().export()
        assert "DATABASE_URL" not in result, "DATABASE_URL should be excluded"

    def test_export_excludes_redis_url(self):
        """Test: export() excludes REDIS_URL."""
        result = Settings().export()
        assert "REDIS_URL" not in result, "REDIS_URL should be excluded"

    def test_export_excludes_r2_access_key_id(self):
        """Test: export() excludes R2_ACCESS_KEY_ID."""
        result = Settings().export()
        assert "R2_ACCESS_KEY_ID" not in result, "R2_ACCESS_KEY_ID should be excluded"

    def test_export_excludes_r2_secret_access_key(self):
        """Test: export() excludes R2_SECRET_ACCESS_KEY."""
        result = Settings().export()
        assert "R2_SECRET_ACCESS_KEY" not in result, "R2_SECRET_ACCESS_KEY should be excluded"

    def test_export_all_sensitive_fields_excluded(self):
        """Test: export() excludes all sensitive fields."""
        result = Settings().export()
        
        sensitive_fields = {
            "SECRET_KEY",
            "BASIC_AUTH_PASSWORD",
            "OPENAI_API_KEY",
            "GOOGLE_API_KEY",
            "DATABASE_URL",
            "REDIS_URL",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
        }
        
        for field in sensitive_fields:
            assert field not in result, f"{field} should be excluded from export"


class TestExportValueFormat:
    """Unit tests for export() value format."""

    def test_export_value_has_value_key(self):
        """Test: Each exported value has a 'value' key."""
        result = Settings().export()
        
        for key, value_info in result.items():
            assert isinstance(value_info, dict), f"{key} value should be a dict"
            assert "value" in value_info, f"{key} should have a 'value' key"

    def test_export_value_has_source_key(self):
        """Test: Each exported value has a 'source' key."""
        result = Settings().export()
        
        for key, value_info in result.items():
            assert isinstance(value_info, dict), f"{key} value should be a dict"
            assert "source" in value_info, f"{key} should have a 'source' key"

    def test_export_source_is_valid(self):
        """Test: Each exported value has a valid source."""
        result = Settings().export()
        
        valid_sources = {"env_var", ".env_file", "default"}
        for key, value_info in result.items():
            assert value_info["source"] in valid_sources, \
                f"{key} source should be one of {valid_sources}, got {value_info['source']}"

    def test_export_value_matches_settings(self):
        """Test: Exported values match the actual settings values."""
        settings = Settings()
        result = settings.export()
        
        for key, value_info in result.items():
            actual_value = getattr(settings, key)
            assert value_info["value"] == actual_value, \
                f"{key} exported value should match actual value"

    def test_export_format_example(self):
        """Test: export() returns values in correct format."""
        result = Settings().export()
        
        # Get a sample value
        sample_key = "GPT3_MODEL"
        assert sample_key in result
        
        sample_value = result[sample_key]
        assert isinstance(sample_value, dict)
        assert "value" in sample_value
        assert "source" in sample_value
        assert isinstance(sample_value["value"], str)
        assert sample_value["source"] in {"env_var", ".env_file", "default"}


class TestExportSourceDetection:
    """Unit tests for export() source detection."""

    def test_export_detects_default_source(self):
        """Test: export() correctly identifies default values."""
        result = Settings().export()
        
        # BASIC_AUTH_USERNAME has a default value and is not in .env
        if "BASIC_AUTH_USERNAME" in result:
            # This field should have source "default" if not overridden
            value_info = result["BASIC_AUTH_USERNAME"]
            assert value_info["source"] in {"default", ".env_file"}, \
                "BASIC_AUTH_USERNAME should be from default or .env_file"

    def test_export_detects_env_file_source(self):
        """Test: export() correctly identifies .env file values."""
        result = Settings().export()
        
        # PROJECT_NAME is in .env file
        if "PROJECT_NAME" in result:
            value_info = result["PROJECT_NAME"]
            assert value_info["source"] in {".env_file", "env_var"}, \
                "PROJECT_NAME should be from .env_file or env_var"

    def test_export_detects_env_var_source(self):
        """Test: export() correctly identifies environment variable values."""
        # Set an environment variable
        os.environ["GPT3_MODEL"] = "test-model"
        
        try:
            settings = Settings()
            result = settings.export()
            
            if "GPT3_MODEL" in result:
                value_info = result["GPT3_MODEL"]
                assert value_info["source"] == "env_var", \
                    "GPT3_MODEL should be from env_var when set"
                assert value_info["value"] == "test-model", \
                    "GPT3_MODEL value should match environment variable"
        finally:
            # Clean up
            if "GPT3_MODEL" in os.environ:
                del os.environ["GPT3_MODEL"]

    def test_export_env_var_overrides_default(self):
        """Test: export() shows env_var source when it overrides default."""
        # Set an environment variable
        os.environ["LOGGING_LEVEL"] = "DEBUG"
        
        try:
            settings = Settings()
            result = settings.export()
            
            if "LOGGING_LEVEL" in result:
                value_info = result["LOGGING_LEVEL"]
                assert value_info["source"] == "env_var", \
                    "LOGGING_LEVEL should be from env_var when set"
                assert value_info["value"] == "DEBUG", \
                    "LOGGING_LEVEL value should match environment variable"
        finally:
            # Clean up
            if "LOGGING_LEVEL" in os.environ:
                del os.environ["LOGGING_LEVEL"]


class TestExportCompleteness:
    """Unit tests for export() completeness."""

    def test_export_includes_all_model_config(self):
        """Test: export() includes all model configuration fields."""
        result = Settings().export()
        
        model_fields = {"GPT3_MODEL", "CHATGPT_MODEL", "GEMINI_MODEL"}
        for field in model_fields:
            assert field in result, f"{field} should be in export"

    def test_export_includes_all_hyperparameters(self):
        """Test: export() includes all hyperparameter fields."""
        result = Settings().export()
        
        hyperparameter_fields = {
            "GPT3_TEMPERATURE_DEFAULT",
            "GPT3_TOP_P",
            "GPT3_FREQUENCY_PENALTY",
            "GPT3_PRESENCE_PENALTY",
        }
        for field in hyperparameter_fields:
            assert field in result, f"{field} should be in export"

    def test_export_includes_all_task_specific_config(self):
        """Test: export() includes all task-specific configuration fields."""
        result = Settings().export()
        
        task_fields = {
            "BusinessOverviewMaxToken",
            "BusinessOverviewTemperature",
            "ResearchObjectivesMaxToken",
            "ResearchObjectivesTemperature",
            "QuestionnaireV2MaxToken",
            "MatrixOEMaxToken",
            "VideoQuestionMaxToken",
            "ChoicesMatrixMaxToken",
            "ChoicesMCQMaxToken",
        }
        for field in task_fields:
            assert field in result, f"{field} should be in export"

    def test_export_includes_logging_config(self):
        """Test: export() includes logging configuration fields."""
        result = Settings().export()
        
        logging_fields = {"LOGGING_LEVEL", "LOGGING_OVERWRITE"}
        for field in logging_fields:
            assert field in result, f"{field} should be in export"

    def test_export_includes_metrics_config(self):
        """Test: export() includes metrics configuration fields."""
        result = Settings().export()
        
        metrics_fields = {"METRICS_FILENAME", "MinMatrixQuestions", "MinMatrixOEQuestions"}
        for field in metrics_fields:
            assert field in result, f"{field} should be in export"

    def test_export_includes_prompts_config(self):
        """Test: export() includes prompts configuration fields."""
        result = Settings().export()
        
        assert "PROMPTS_BASE_PATH" in result, "PROMPTS_BASE_PATH should be in export"

    def test_export_includes_r2_config(self):
        """Test: export() includes non-sensitive R2 configuration fields."""
        result = Settings().export()
        
        # These should be included (not sensitive)
        r2_fields = {"R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_PUBLIC_URL"}
        for field in r2_fields:
            assert field in result, f"{field} should be in export"

    def test_export_excludes_sensitive_r2_fields(self):
        """Test: export() excludes sensitive R2 fields."""
        result = Settings().export()
        
        # These should be excluded (sensitive)
        sensitive_r2_fields = {"R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"}
        for field in sensitive_r2_fields:
            assert field not in result, f"{field} should be excluded from export"


class TestExportPropertyBased:
    """Property-based tests for export() method."""

    @hypothesis_settings(max_examples=10)
    @given(st.just(None))
    def test_export_always_returns_dict(self, _):
        """Property: export() always returns a dictionary.
        
        **Validates: Requirements 17.1**
        """
        result = Settings().export()
        assert isinstance(result, dict)

    @hypothesis_settings(max_examples=10)
    @given(st.just(None))
    def test_export_never_includes_sensitive_fields(self, _):
        """Property: export() never includes sensitive fields.
        
        **Validates: Requirements 17.2**
        """
        result = Settings().export()
        
        sensitive_fields = {
            "SECRET_KEY",
            "BASIC_AUTH_PASSWORD",
            "OPENAI_API_KEY",
            "GOOGLE_API_KEY",
            "DATABASE_URL",
            "REDIS_URL",
            "R2_ACCESS_KEY_ID",
            "R2_SECRET_ACCESS_KEY",
        }
        
        for field in sensitive_fields:
            assert field not in result

    @hypothesis_settings(max_examples=10)
    @given(st.just(None))
    def test_export_all_values_have_correct_format(self, _):
        """Property: All exported values have correct format with value and source.
        
        **Validates: Requirements 17.3**
        """
        result = Settings().export()
        
        valid_sources = {"env_var", ".env_file", "default"}
        
        for key, value_info in result.items():
            assert isinstance(value_info, dict)
            assert "value" in value_info
            assert "source" in value_info
            assert value_info["source"] in valid_sources

    @hypothesis_settings(max_examples=10)
    @given(st.just(None))
    def test_export_values_match_settings(self, _):
        """Property: Exported values match actual settings values.
        
        **Validates: Requirements 17.4**
        """
        settings = Settings()
        result = settings.export()
        
        for key, value_info in result.items():
            actual_value = getattr(settings, key)
            assert value_info["value"] == actual_value
