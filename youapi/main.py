import re

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

app = FastAPI()


# Response Models
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


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}


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
    # Extract video ID from URL if needed
    try:
        actual_video_id = extract_video_id(video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Fetch transcript
    try:
        ytt_api = YouTubeTranscriptApi()
        if lang:
            transcript = ytt_api.fetch(actual_video_id, languages=[lang])
        else:
            transcript = ytt_api.fetch(actual_video_id)

        # Build response
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