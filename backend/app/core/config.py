import os
import logging
from pydantic import field_validator, ValidationError, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    PROJECT_NAME: str 
    ENVIRONMENT: str = "production"
    SECRET_KEY: str = "your-secret-key-change-in-production"  # Change in production!
    BASIC_AUTH_USERNAME: str = "admin"
    BASIC_AUTH_PASSWORD: str = "surveygen2024"
    OPENAI_API_KEY: str
    GOOGLE_API_KEY: str 
    DATABASE_URL: str 
    REDIS_URL: str 
    
    # R2 Storage Config
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""
    
    # Models config
    GPT3_MODEL: str = "gpt-4o-mini"
    CHATGPT_MODEL: str = "gpt-4o-mini"
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Optional parameters based on environment variable defaults
    GPT3_TEMPERATURE_DEFAULT: float = 0.0
    GPT3_TOP_P: float = 1.0
    GPT3_FREQUENCY_PENALTY: float = 0.0
    GPT3_PRESENCE_PENALTY: float = 0.0

    BusinessOverviewMaxToken: int = 1000
    BusinessOverviewTemperature: float = 0.7
    ResearchObjectivesMaxToken: int = 800
    ResearchObjectivesTemperature: float = 0.2
    QuestionnaireV2MaxToken: int = 1000
    MatrixOEMaxToken: int = 100
    VideoQuestionMaxToken: int = 300
    ChoicesMatrixMaxToken: int = 100
    ChoicesMCQMaxToken: int = 200
    
    # Inference / Metrics
    METRICS_FILENAME: str = "survey_generator_metrics.csv"
    MinMatrixQuestions: int = 1
    MinMatrixOEQuestions: int = 1
    INCLUDE_VIDEO_QUESTIONS: bool = False  # Set to True to include video questions

    # Logging config
    LOGGING_LEVEL: str = "INFO"
    LOGGING_OVERWRITE: bool = False
    
    # Prompt config
    PROMPTS_BASE_PATH: str = "prompts/prompts_chatgpt"
    
    @model_validator(mode='after')
    def validate_secret_key(self):
        """
        Validate SECRET_KEY is not the default insecure value in production.
        """
        is_development = self.ENVIRONMENT.lower() == "development"
        if self.SECRET_KEY == "your-secret-key-change-in-production" and not is_development:
            raise ValueError(
                "SECURITY: Default SECRET_KEY used in non-development environment. "
                "Set a secure SECRET_KEY in your .env file."
            )
        return self

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", ".env"), 
        env_file_encoding='utf-8',
        case_sensitive=False,  # Allow mixed case env variables
        extra='ignore'
    )

    # Field validators for LLM hyperparameters
    @field_validator('GPT3_TEMPERATURE_DEFAULT', mode='before')
    @classmethod
    def validate_gpt3_temperature(cls, v):
        """Validate GPT3_TEMPERATURE_DEFAULT is between -2.0 and 2.0."""
        if isinstance(v, str):
            try:
                v = float(v)
            except ValueError:
                raise ValueError(f"Temperature must be a number, got {type(v).__name__}")
        return cls.validate_temperature(v)

    @field_validator('GPT3_TOP_P', mode='before')
    @classmethod
    def validate_gpt3_top_p(cls, v):
        """Validate GPT3_TOP_P is between 0.0 and 1.0."""
        if isinstance(v, str):
            try:
                v = float(v)
            except ValueError:
                raise ValueError(f"Top-p must be a number, got {type(v).__name__}")
        return cls.validate_top_p(v)

    @field_validator('GPT3_FREQUENCY_PENALTY', mode='before')
    @classmethod
    def validate_gpt3_frequency_penalty(cls, v):
        """Validate GPT3_FREQUENCY_PENALTY is between -2.0 and 2.0."""
        if isinstance(v, str):
            try:
                v = float(v)
            except ValueError:
                raise ValueError(f"Penalty must be a number, got {type(v).__name__}")
        return cls.validate_penalty(v)

    @field_validator('GPT3_PRESENCE_PENALTY', mode='before')
    @classmethod
    def validate_gpt3_presence_penalty(cls, v):
        """Validate GPT3_PRESENCE_PENALTY is between -2.0 and 2.0."""
        if isinstance(v, str):
            try:
                v = float(v)
            except ValueError:
                raise ValueError(f"Penalty must be a number, got {type(v).__name__}")
        return cls.validate_penalty(v)

    # Field validators for task-specific temperatures (0.0 to 2.0)
    @field_validator('BusinessOverviewTemperature', 'ResearchObjectivesTemperature', mode='before')
    @classmethod
    def validate_task_temperature(cls, v):
        """Validate task-specific temperatures are between 0.0 and 2.0."""
        if isinstance(v, str):
            try:
                v = float(v)
            except ValueError:
                raise ValueError(f"Temperature must be a number, got {type(v).__name__}")
        if not isinstance(v, (int, float)):
            raise ValueError(f"Temperature must be a number, got {type(v).__name__}")
        if v < 0.0 or v > 2.0:
            raise ValueError(f"Temperature must be between 0.0 and 2.0, got {v}")
        return float(v)

    # Field validators for task-specific token fields (positive integers)
    @field_validator(
        'BusinessOverviewMaxToken',
        'ResearchObjectivesMaxToken',
        'QuestionnaireV2MaxToken',
        'MatrixOEMaxToken',
        'VideoQuestionMaxToken',
        'ChoicesMatrixMaxToken',
        'ChoicesMCQMaxToken',
        'MinMatrixQuestions',
        'MinMatrixOEQuestions',
        mode='before'
    )
    @classmethod
    def validate_token_field(cls, v):
        """Validate token fields are positive integers."""
        if isinstance(v, str):
            try:
                v = int(v)
            except ValueError:
                raise ValueError(f"Value must be an integer, got {type(v).__name__}")
        return cls.validate_positive_int(v)

    # Field validator for LOGGING_LEVEL
    @field_validator('LOGGING_LEVEL', mode='before')
    @classmethod
    def validate_logging_level_field(cls, v):
        """Validate LOGGING_LEVEL is one of: DEBUG, INFO, WARNING, ERROR, CRITICAL."""
        return cls.validate_log_level(v)

    # Field validators for model names (non-empty strings)
    @field_validator('GPT3_MODEL', 'CHATGPT_MODEL', 'GEMINI_MODEL', mode='before')
    @classmethod
    def validate_model_name(cls, v):
        """Validate model names are non-empty strings."""
        return cls.validate_non_empty_string(v)

    # Field validator for PROMPTS_BASE_PATH (non-empty string)
    @field_validator('PROMPTS_BASE_PATH', mode='before')
    @classmethod
    def validate_prompts_base_path(cls, v):
        """Validate PROMPTS_BASE_PATH is a non-empty string."""
        return cls.validate_non_empty_string(v)

    @staticmethod
    def validate_temperature(value: float) -> float:
        """Validate temperature is between -2.0 and 2.0.
        
        Args:
            value: Temperature value to validate
            
        Returns:
            The validated temperature value
            
        Raises:
            ValueError: If temperature is outside the acceptable range
        """
        if not isinstance(value, (int, float)):
            raise ValueError(f"Temperature must be a number, got {type(value).__name__}")
        if value < -2.0 or value > 2.0:
            raise ValueError(f"Temperature must be between -2.0 and 2.0, got {value}")
        return float(value)

    @staticmethod
    def validate_top_p(value: float) -> float:
        """Validate top_p is between 0.0 and 1.0.
        
        Args:
            value: Top-p value to validate
            
        Returns:
            The validated top_p value
            
        Raises:
            ValueError: If top_p is outside the acceptable range
        """
        if not isinstance(value, (int, float)):
            raise ValueError(f"Top-p must be a number, got {type(value).__name__}")
        if value < 0.0 or value > 1.0:
            raise ValueError(f"Top-p must be between 0.0 and 1.0, got {value}")
        return float(value)

    @staticmethod
    def validate_penalty(value: float) -> float:
        """Validate penalty is between -2.0 and 2.0.
        
        Args:
            value: Penalty value to validate
            
        Returns:
            The validated penalty value
            
        Raises:
            ValueError: If penalty is outside the acceptable range
        """
        if not isinstance(value, (int, float)):
            raise ValueError(f"Penalty must be a number, got {type(value).__name__}")
        if value < -2.0 or value > 2.0:
            raise ValueError(f"Penalty must be between -2.0 and 2.0, got {value}")
        return float(value)

    @staticmethod
    def validate_log_level(value: str) -> str:
        """Validate log level is one of: DEBUG, INFO, WARNING, ERROR, CRITICAL.
        
        Args:
            value: Log level to validate
            
        Returns:
            The validated log level
            
        Raises:
            ValueError: If log level is not in the allowed values
        """
        allowed_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if not isinstance(value, str):
            raise ValueError(f"Log level must be a string, got {type(value).__name__}")
        value_upper = value.upper()
        if value_upper not in allowed_levels:
            raise ValueError(f"Log level must be one of {allowed_levels}, got {value}")
        return value_upper

    @staticmethod
    def validate_positive_int(value: int) -> int:
        """Validate value is a positive integer.
        
        Args:
            value: Integer value to validate
            
        Returns:
            The validated positive integer
            
        Raises:
            ValueError: If value is not a positive integer
        """
        if not isinstance(value, int) or isinstance(value, bool):
            raise ValueError(f"Value must be an integer, got {type(value).__name__}")
        if value <= 0:
            raise ValueError(f"Value must be a positive integer, got {value}")
        return value

    @staticmethod
    def validate_non_empty_string(value: str) -> str:
        """Validate value is a non-empty string.
        
        Args:
            value: String value to validate
            
        Returns:
            The validated non-empty string
            
        Raises:
            ValueError: If value is not a non-empty string
        """
        if not isinstance(value, str):
            raise ValueError(f"Value must be a string, got {type(value).__name__}")
        if not value or not value.strip():
            raise ValueError("Value must be a non-empty string")
        return value

    def export(self) -> dict:
        """Export current configuration excluding sensitive values.
        
        Returns a dictionary of all non-sensitive configuration values with their
        source information (environment variable, .env file, or default).
        
        Sensitive fields excluded: SECRET_KEY, BASIC_AUTH_PASSWORD, OPENAI_API_KEY,
        GOOGLE_API_KEY, DATABASE_URL, REDIS_URL, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
        
        Returns:
            Dictionary with format: {"KEY": {"value": "...", "source": "..."}}
            where source is one of: "env_var", ".env_file", or "default"
            
        Example:
            {
                "GPT3_MODEL": {"value": "gpt-4o-mini", "source": "default"},
                "LOGGING_LEVEL": {"value": "INFO", "source": "env_var"},
                "PROMPTS_BASE_PATH": {"value": "prompts/prompts_chatgpt", "source": ".env_file"}
            }
        """
        # Sensitive fields to exclude from export
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
        
        result = {}
        
        # Get all fields from the model class (not instance)
        for field_name, field_info in self.__class__.model_fields.items():
            # Skip sensitive fields
            if field_name in sensitive_fields:
                continue
            
            # Get the current value
            value = getattr(self, field_name)
            
            # Determine the source of the value
            source = self._get_field_source(field_name, value, field_info)
            
            result[field_name] = {
                "value": value,
                "source": source
            }
        
        return result

    def _get_field_source(self, field_name: str, value, field_info) -> str:
        """Determine the source of a configuration value.
        
        Args:
            field_name: Name of the configuration field
            value: Current value of the field
            field_info: Pydantic field information
            
        Returns:
            Source string: "env_var", ".env_file", or "default"
        """
        # Check if value comes from environment variable
        env_var_name = field_name.upper()
        if env_var_name in os.environ:
            return "env_var"
        
        # Check if value comes from .env file
        # We need to check if the value differs from the default
        default_value = field_info.default
        if default_value is not None and value != default_value:
            return ".env_file"
        
        # Otherwise it's from default
        return "default"

    def reload(self) -> list:
        """Reload configuration from environment variables and .env file.
        
        This method reloads all configuration values from environment variables
        and the .env file. If validation fails, the previous configuration is
        maintained and an error is raised. If validation succeeds, all
        configuration values are updated and a list of changed values is returned.
        
        Returns:
            List of configuration keys that changed during reload
            
        Raises:
            ValidationError: If any configuration value fails validation.
                             Previous configuration is maintained when this occurs.
                             
        Example:
            >>> os.environ["LOGGING_LEVEL"] = "DEBUG"
            >>> changed = settings.reload()
            >>> print(changed)
            ['LOGGING_LEVEL']
        """
        # Store current configuration values
        previous_values = {}
        for field_name in self.__class__.model_fields.keys():
            previous_values[field_name] = getattr(self, field_name)
        
        try:
            # Create a new Settings instance to reload from environment and .env
            new_settings = Settings()
            
            # Validate all new values by accessing them
            # (Pydantic validators run during __init__)
            for field_name in self.__class__.model_fields.keys():
                getattr(new_settings, field_name)
            
            # If we get here, validation succeeded
            # Update all configuration values
            changed_keys = []
            for field_name in self.__class__.model_fields.keys():
                new_value = getattr(new_settings, field_name)
                old_value = previous_values[field_name]
                
                if new_value != old_value:
                    setattr(self, field_name, new_value)
                    changed_keys.append(field_name)
            
            # Log which values changed
            if changed_keys:
                logger.info(f"Configuration reloaded. Changed values: {', '.join(changed_keys)}")
                for key in changed_keys:
                    old_val = previous_values[key]
                    new_val = getattr(self, key)
                    logger.debug(f"  {key}: {old_val} -> {new_val}")
            else:
                logger.info("Configuration reloaded. No values changed.")
            
            return changed_keys
            
        except ValidationError:
            # Validation failed, restore previous values
            for field_name, value in previous_values.items():
                setattr(self, field_name, value)
            
            logger.error("Configuration reload failed. Previous configuration maintained.")
            raise

settings = Settings()
