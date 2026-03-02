import os
import re
from collections import defaultdict

from openai import OpenAI


def get_openai_client(api_key: str | None = None) -> OpenAI:
    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise ValueError("OPENAI_API_KEY is not set.")
    return OpenAI(api_key=key)


def call_openai_model(
    client: OpenAI,
    prompt: str,
    model_name: str,
    *,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    system_prompt: str = "You are a helpful assistant.",
) -> str:
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""


def parse_sections(text: str, section_name: str, repeatable: bool = False):
    prefix = "!" if repeatable else ""
    pattern = re.compile(
        rf"<<{prefix}{section_name}>>\s*(.*?)\s*<</{prefix}{section_name}>>",
        re.DOTALL,
    )
    matches = pattern.findall(text)
    if repeatable:
        return [m.strip() for m in matches]
    return matches[0].strip() if matches else None


def parse_metadata(section_text: str):
    pattern = re.compile(r"<<([A-Z_]+):\s*\"?(.*?)\"?\s*>>")
    result = defaultdict(list)
    for token, value in pattern.findall(section_text):
        result[token].append(value.strip())
    for k in list(result.keys()):
        if len(result[k]) == 1:
            result[k] = result[k][0]
    return dict(result)


CHUNK_PROMPT = """
You are an AI that converts slides into logical content units.

Instructions:
- For each slide, reason and decide which "chunk" it belongs to.
- Output each chunk as an empty structured section, with only metadata tokens.
- Do NOT put any reasoning inside the tokens.
- Use the following token format strictly:

<<!CHUNK>>
<<FILENAME:"filename_here">>
<<CHUNKBEGIN:beginslide_number_inclusive>>
<<CHUNKEND:endslide_number_inclusive>>
<</!CHUNK>>
"""

THEORY_PROMPT = """
Task: Generate questions based purely on the content of the slide (Theory).
Reason outside the token blocks only. Do not include any reasoning inside tokens.
"""

APPLIED_PROMPT = """
Task: Generate questions that apply the slide content to a broader context (Applied).
Reason outside the token blocks only. Do not include reasoning inside tokens.
"""

MCQ_PROMPT = """
Output format:

<<QUESTION>>
<<!SLIDE:the slide number here>>
question text
<</QUESTION>>
<<!OPTION>>Option 1<</!OPTION>>
<<!OPTION>>Option 2<</!OPTION>>
<<!OPTION>>Option 3<</!OPTION>>
<<!OPTION>>Option 4<</!OPTION>>
<<ANSWER>>0/1/2/3<</ANSWER>>
"""

TEXT_PROMPT = """
Output format:

<<QUESTION>>
<<!SLIDE:the slide number here>>
<<FORMAT:TEXT/LATEX/CODE>>
question text
<</QUESTION>>
<<ANSWER>>
model answer
<</ANSWER>>
"""

GRADE_TEXT_PROMPT = """
You are a strict conceptual grader.
Score from 0 to 10 as an integer.

Output format:
<<SCORE>>X<</SCORE>>
"""


def build_chunk_request(slides_text: str, file_name: str) -> str:
    return f'{CHUNK_PROMPT}\n\nFILENAME:"{file_name}"\n\nSLIDES:\n{slides_text}'


def build_quiz_prompt(chunk_text: str, topic_type: str, format_type: str) -> str:
    topic_prompt = THEORY_PROMPT if topic_type == "Theory" else APPLIED_PROMPT
    format_prompt = MCQ_PROMPT if format_type == "MCQ" else TEXT_PROMPT
    return f"""
You are a quiz-generating AI. Generate exactly one question and include slide citations.

{topic_prompt}

You must follow this token format strictly:
{format_prompt}

Slides content:
{chunk_text}
"""


def build_grade_prompt(question: str, correct_answer: str, user_answer: str) -> str:
    return f"""
{GRADE_TEXT_PROMPT}

Question:
{question}

Model Answer:
{correct_answer}

User Answer:
{user_answer}
"""


def generate_chunks(slides_text: str, file_name: str, model_name: str = "gpt-4o-mini"):
    prompt = build_chunk_request(slides_text, file_name)
    response = call_openai_model(
        client=get_openai_client(),
        prompt=prompt,
        model_name=model_name,
    )
    return response.strip()


def generate_quiz_modular(
    chunk_text: str,
    topic_type: str = "Theory",
    format_type: str = "MCQ",
    model_name: str = "gpt-4o-mini",
):
    prompt = build_quiz_prompt(chunk_text, topic_type, format_type)
    response = call_openai_model(
        client=get_openai_client(),
        prompt=prompt,
        model_name=model_name,
        temperature=0.0,
        max_tokens=2048,
    )
    return response.strip()


def grade_mcq_quiz(correct_answer: str, user_answer: str) -> int:
    return 10 if user_answer == correct_answer else 0


def grade_nonmcq_quiz(
    question: str,
    correct_answer: str,
    user_answer: str,
    model_name: str = "gpt-4o-mini",
):
    prompt = build_grade_prompt(question, correct_answer, user_answer)
    response = call_openai_model(
        client=get_openai_client(),
        prompt=prompt,
        model_name=model_name,
        temperature=0.0,
        max_tokens=512,
    )
    score = parse_sections(response, "SCORE", repeatable=False)
    return int(score) if score and str(score).isdigit() else 0


def grade_quiz(
    raw_quiz_text: str,
    user_answer: str,
    question_type: str = "MCQ",
    model_name: str = "gpt-4o-mini",
):
    correct_answer = parse_sections(raw_quiz_text, "ANSWER", repeatable=False) or ""
    if question_type == "MCQ":
        return grade_mcq_quiz(correct_answer, user_answer)
    question = parse_sections(raw_quiz_text, "QUESTION", repeatable=False) or ""
    return grade_nonmcq_quiz(question, correct_answer, user_answer, model_name)
