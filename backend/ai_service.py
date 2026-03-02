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


CHUNK_PROMPT = CHUNK_PROMPT = """
You are an AI that converts slides into logical content units.

Instructions:
- For each slide, reason and decide which "chunk" it belongs to.
- Output each chunk as an **empty structured section**, with only metadata tokens.
- AI reasoning MUST appear outside the tokens.
- AI MUST reason about chunk choice before any token begin.
- Use the following token format strictly:

<<!CHUNK>>
<<FILENAME:"filename_here">>
<<CHUNKBEGIN:beginslide_number_inclusive>>
<<CHUNKEND:endslide_number_inclusive>>
<</!CHUNK>>

- Each CHUNK must correspond to one unit of content (e.g., 5-10 slides).
- Multiple CHUNKs should be output as multiple <<!CHUNK>> ... <</!CHUNK>> blocks.
- CHUNK should be complete but must not overlap.
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

(thinking and planning here)

<<QUESTION>>
<<!SLIDE:the slide number here>>
<<!SLIDE:additional slide numbers if needed>>
(Write the question text here)
<</QUESTION>>

<<!TOPIC>>topic 1<</!TOPIC>>
<<!TOPIC>>topic 2<</!TOPIC>>
<<!TOPIC>>topic 3<</!TOPIC>>

<<!OPTION>>Option 1<</!OPTION>>
<<!OPTION>>Option 2<</!OPTION>>
<<!OPTION>>Option 3<</!OPTION>>
<<!OPTION>>Option 4<</!OPTION>>
<<ANSWER>>0/1/2/3<</ANSWER>>

Rules:
- Must strictly follow this token structure.
- No extra text inside tokens.
- Include relevant <<!TOPIC>>...<</!TOPIC>> blocks.
- Topics must be short, concise noun phrases.
"""

TEXT_PROMPT = """
Output format:

(thinking and planning here)

<<QUESTION>>
<<!SLIDE:the slide number here>>
<<!SLIDE:additional slide numbers if needed>>
<<FORMAT:TEXT/LATEX/CODE>>
(Write the question text here)
<</QUESTION>>
<<ANSWER>>
(Modal answer)
<</ANSWER>>

<<!TOPIC>>topic 1<</!TOPIC>>
<<!TOPIC>>topic 2<</!TOPIC>>
<<!TOPIC>>topic 3<</!TOPIC>>

Rules:
- Must strictly follow this token structure.
- No extra text inside tokens.
- Choose the format for the answer you expected correctly: TEXT is for generic plain text answer; LATEX is for maths expression, or result of calculation answer (a number); CODE is for code answer.
- MUST include relevant <<!TOPIC>>...<</!TOPIC>> blocks.
- Topics must be short, concise noun phrases.
"""

GRADE_TEXT_PROMPT = """
You are a knowledge grader. You will be provided with:

1) A question
2) A model answer
3) A user's answer

Your task is to evaluate whether the user's answer demonstrates correct understanding of the concepts required by the question.

Evaluation principles:
- The question is the primary reference.
- The model answer is a conceptual benchmark.
- Focus only on conceptual correctness and understanding: how well the response answers the question, and more importantly, how well the response demonstrates the student's understanding of the question and related concept is enough
- Do NOT evaluate writing style, structure, grammar, polish, verbosity or length.
- Do NOT penalize brevity if the core concept is correct.
- Deduct points for:
  - Conceptual errors
  - Misinterpretations
  - Missing required KEY ideas (should be marginal in point deduction)
  - Logical contradictions

Scoring:
- Score must be an integer from 0 to 10.
- 0 = conceptually incorrect or irrelevant.
- 10 = fully correct UNDERSTANDING of the required concepts.
- Intermediate scores reflect partial UNDERSTANDING.

Output format:

(thinking and planning here)
<<SCORE>>X<</SCORE>>

Rules:
- Must strictly follow this output structure.
- No extra text inside tokens.
"""


def build_chunk_request(slides_text: str, file_name: str) -> str:
    return f'{CHUNK_PROMPT}\n\nFILENAME:"{file_name}"\n\nSLIDES:\n{slides_text}'


def build_quiz_prompt(chunk_text: str, topic_type: str, format_type: str) -> str:
    topic_prompt = THEORY_PROMPT if topic_type == "Theory" else APPLIED_PROMPT
    format_prompt = MCQ_PROMPT if format_type == "MCQ" else TEXT_PROMPT
    return f"""
    You are a quiz-generating AI. You should only generate ONE question.
    - The question should be related to the slides and you should be able to add citation back to the slides where the knowledge being tested come from using the <<!SLIDE:SLIDENUMBER>> token.
    - The metadata token <<!SLIDE:1/2/3/...>> (the "!") mean that you can add more than 1 slide in citation so please include all relavent slides in the question.
    - The content can span multiple slide but your question can focus on cross slide knowledge or just 1 sentence in 1 slide, it is up to you but please cite the slide number accordingly.
    - DO NOT put answer inside the question token, the question token should only include slide meta data, and ONE question only.
    - AI reasoning MUST appear outside the tokens.
    - AI MUST reason and plan the question and answer option before any token begin.
    - DO NOT include unnessary whitespace character.

    {topic_prompt}

    You must follow this token format strictly, otherwise use text freely:

    {format_prompt}

    Here is the content from the slides:

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
