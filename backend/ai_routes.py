from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .ai_service import (
    generate_chunks,
    generate_quiz_modular,
    grade_quiz,
    parse_metadata,
    parse_sections,
)

router = APIRouter(prefix="/ai", tags=["ai"])


class ChunksRequest(BaseModel):
    slides_text: str = Field(min_length=1)
    file_name: str = Field(min_length=1)
    model_name: str = "gpt-4o-mini"


class QuizRequest(BaseModel):
    chunk_text: str = Field(min_length=1)
    topic_type: str = "Theory"
    format_type: str = "MCQ"
    model_name: str = "gpt-4o-mini"


class GradeRequest(BaseModel):
    raw_quiz_text: str = Field(min_length=1)
    user_answer: str = ""
    question_type: str = "MCQ"
    model_name: str = "gpt-4o-mini"


@router.post("/chunks")
def create_chunks(payload: ChunksRequest):
    try:
        raw = generate_chunks(payload.slides_text, payload.file_name, payload.model_name)
        chunks = [
            parse_metadata(chunk) for chunk in parse_sections(raw, "CHUNK", repeatable=True)
        ]
        return {"raw": raw, "chunks": chunks}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/quiz")
def create_quiz(payload: QuizRequest):
    try:
        raw = generate_quiz_modular(
            payload.chunk_text,
            payload.topic_type,
            payload.format_type,
            payload.model_name,
        )
        return {"raw": raw}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/grade")
def grade(payload: GradeRequest):
    try:
        score = grade_quiz(
            payload.raw_quiz_text,
            payload.user_answer,
            payload.question_type,
            payload.model_name,
        )
        return {"score": score}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
