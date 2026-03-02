from pydantic import BaseModel, Field


class GenerateChunksRequest(BaseModel):
    slides_text: str = Field(min_length=1)
    file_name: str = Field(min_length=1)
    model_name: str = "gpt-4o-mini"


class GenerateQuizRequest(BaseModel):
    chunk_text: str = Field(min_length=1)
    topic_type: str = "Theory"
    format_type: str = "MCQ"
    model_name: str = "gpt-4o-mini"


class GradeQuizRequest(BaseModel):
    raw_quiz_text: str = Field(min_length=1)
    user_answer: str = ""
    question_type: str = "MCQ"
    model_name: str = "gpt-4o-mini"
