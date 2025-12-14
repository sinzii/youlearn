import re
from enum import Enum
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

from ai_sdk import generate_text, stream_text, openai
from ai_sdk.types import CoreSystemMessage, CoreUserMessage, CoreAssistantMessage

load_dotenv()

app = FastAPI(docs_url="/swagger", title="YouAPI", description="YouTube Learning API")

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enums
class ModelName(str, Enum):
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4O = "gpt-4o"


# Request/Response Models
class TranscriptSegment(BaseModel):
    text: str
    start: float
    duration: float


class TranscriptResponse(BaseModel):
    video_id: str
    language: str
    language_code: str
    is_generated: bool
    segments: list[TranscriptSegment]


class SummarizeRequest(BaseModel):
    video_id: str
    model: ModelName = ModelName.GPT_4O_MINI


class SummarizeResponse(BaseModel):
    video_id: str
    summary: str
    model: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    video_id: str
    messages: list[ChatMessage]
    model: ModelName = ModelName.GPT_4O_MINI


# YouTube URL parsing utility
def extract_video_id(video_id_or_url: str) -> str:
    """
    Extract YouTube video ID from various URL formats or return as-is if already an ID.

    Supported formats:
    - youtube.com/watch?v=VIDEO_ID
    - youtu.be/VIDEO_ID
    - youtube.com/embed/VIDEO_ID
    - youtube.com/shorts/VIDEO_ID
    - Direct 11-character video ID
    """
    # Pattern for direct video ID (11 characters: alphanumeric, underscore, hyphen)
    video_id_pattern = r"^[a-zA-Z0-9_-]{11}$"
    if re.match(video_id_pattern, video_id_or_url):
        return video_id_or_url

    # URL patterns
    patterns = [
        r"(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})",  # youtube.com/watch?v=
        r"(?:youtu\.be\/)([a-zA-Z0-9_-]{11})",  # youtu.be/
        r"(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})",  # youtube.com/embed/
        r"(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})",  # youtube.com/shorts/
    ]

    for pattern in patterns:
        match = re.search(pattern, video_id_or_url)
        if match:
            return match.group(1)

    raise ValueError(f"Could not extract video ID from: {video_id_or_url}")


def fetch_transcript_text(video_id: str) -> tuple[str, TranscriptResponse]:
    """Fetch transcript and return both raw text and structured response."""
    try:
        actual_video_id = extract_video_id(video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(actual_video_id)

        segments = [
            TranscriptSegment(
                text=snippet.text,
                start=snippet.start,
                duration=snippet.duration,
            )
            for snippet in transcript.snippets
        ]

        response = TranscriptResponse(
            video_id=actual_video_id,
            language=transcript.language,
            language_code=transcript.language_code,
            is_generated=transcript.is_generated,
            segments=segments,
        )

        # Combine all text for LLM context
        full_text = " ".join(snippet.text for snippet in transcript.snippets)

        return full_text, response

    except TranscriptsDisabled:
        raise HTTPException(
            status_code=400,
            detail=f"Transcripts are disabled for video: {actual_video_id}",
        )
    except NoTranscriptFound:
        raise HTTPException(
            status_code=404,
            detail=f"No transcript found for video: {actual_video_id}",
        )
    except VideoUnavailable:
        raise HTTPException(
            status_code=404,
            detail=f"Video unavailable: {actual_video_id}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch transcript: {str(e)}",
        )


@app.get("/")
def read_root():
    return {"message": "YouAPI - YouTube Learning API"}


@app.get("/youtube/transcript", response_model=TranscriptResponse)
def get_transcript(
    video_id: str = Query(..., description="YouTube video ID or URL"),
    lang: str | None = Query(None, description="Preferred language code (e.g., 'en', 'vi')"),
):
    """
    Get transcript for a YouTube video.

    - **video_id**: YouTube video ID or full URL (supports youtube.com/watch, youtu.be, embed, shorts)
    - **lang**: Optional preferred language code
    """
    try:
        actual_video_id = extract_video_id(video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        ytt_api = YouTubeTranscriptApi()
        if lang:
            transcript = ytt_api.fetch(actual_video_id, languages=[lang])
        else:
            transcript = ytt_api.fetch(actual_video_id)

        segments = [
            TranscriptSegment(
                text=snippet.text,
                start=snippet.start,
                duration=snippet.duration,
            )
            for snippet in transcript.snippets
        ]

        return TranscriptResponse(
            video_id=actual_video_id,
            language=transcript.language,
            language_code=transcript.language_code,
            is_generated=transcript.is_generated,
            segments=segments,
        )

    except TranscriptsDisabled:
        raise HTTPException(
            status_code=400,
            detail=f"Transcripts are disabled for video: {actual_video_id}",
        )
    except NoTranscriptFound:
        raise HTTPException(
            status_code=404,
            detail=f"No transcript found for video: {actual_video_id}",
        )
    except VideoUnavailable:
        raise HTTPException(
            status_code=404,
            detail=f"Video unavailable: {actual_video_id}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch transcript: {str(e)}",
        )


@app.post("/summarize", response_model=SummarizeResponse)
def summarize_video(request: SummarizeRequest):
    """
    Generate a summary of a YouTube video transcript.

    - **video_id**: YouTube video ID or URL
    - **model**: LLM model to use (gpt-4o-mini or gpt-4o)
    """
    # Fetch transcript
    transcript_text, _ = fetch_transcript_text(request.video_id)

    # Generate summary using AI SDK
    try:
        model = openai(request.model.value)
        result = generate_text(
            model=model,
            prompt=f"""Please provide a comprehensive summary of the following YouTube video transcript.
Include the main topics, key points, and any important takeaways.

Transcript:
{transcript_text}

Summary:""",
        )

        return SummarizeResponse(
            video_id=extract_video_id(request.video_id),
            summary=result.text,
            model=request.model.value,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}",
        )


@app.post("/chat")
async def chat_with_video(request: ChatRequest):
    """
    Chat with a YouTube video transcript. Returns a streaming response.

    - **video_id**: YouTube video ID or URL
    - **messages**: Chat history
    - **model**: LLM model to use (gpt-4o-mini or gpt-4o)
    """
    # Fetch transcript
    transcript_text, _ = fetch_transcript_text(request.video_id)

    # Build messages with system context
    system_prompt = f"""You are a helpful assistant that answers questions about a YouTube video.
Use the following transcript to answer the user's questions accurately and helpfully.
If the answer cannot be found in the transcript, say so clearly.

Video Transcript:
{transcript_text}"""

    # Convert messages to the format expected by AI SDK
    messages: list[CoreSystemMessage | CoreUserMessage | CoreAssistantMessage] = [
        CoreSystemMessage(content=system_prompt)
    ]
    for msg in request.messages:
        if msg.role == "user":
            messages.append(CoreUserMessage(content=msg.content))
        else:
            messages.append(CoreAssistantMessage(content=msg.content))

    try:
        model = openai(request.model.value)

        async def generate():
            result = stream_text(model=model, messages=messages)
            async for chunk in result.text_stream:
                if chunk:
                    yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate response: {str(e)}",
        )
