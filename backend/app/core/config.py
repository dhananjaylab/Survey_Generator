import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Survey Generator API"
    BASIC_AUTH_USERNAME: str = "admin"
    BASIC_AUTH_PASSWORD: str = "surveygen2024"
    OPENAI_API_KEY: str
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # R2 Storage Config
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""
    R2_PUBLIC_URL: str = ""
    
    # Models config
    GPT3_MODEL: str = "gpt-4o-mini"
    CHATGPT_MODEL: str = "gpt-4o-mini"
    
    # Optional parameters based on config.ini defaults
    BusinessOverviewMaxToken: int = 200
    BusinessOverviewTemperature: float = 0.7
    ResearchObjectivesMaxToken: int = 400
    ResearchObjectivesTemperature: float = 0.2
    QuestionnaireV2MaxToken: int = 1000
    MatrixOEMaxToken: int = 100
    VideoQuestionMaxToken: int = 300
    ChoicesMatrixMaxToken: int = 100
    ChoicesMCQMaxToken: int = 200
    
    MinMatrixQuestions: int = 1
    MinMatrixOEQuestions: int = 1
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

settings = Settings()
