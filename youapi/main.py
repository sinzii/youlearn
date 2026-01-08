import os
import re
from enum import Enum
from typing import Literal

from clerk_backend_api import Clerk
from clerk_backend_api.security import AuthenticateRequestOptions
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from pytubefix import YouTube
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)
from youtube_transcript_api.proxies import WebshareProxyConfig

from ai_sdk import generate_object, stream_text, openai
from ai_sdk.types import CoreSystemMessage, CoreUserMessage, CoreAssistantMessage

load_dotenv()

# Initialize Clerk client
clerk = Clerk(bearer_auth=os.environ.get("CLERK_SECRET_KEY"))

# Initialize YouTube Transcript API with Webshare proxy (if configured)
webshare_username = os.environ.get("WEBSHARE_PROXY_USERNAME")
webshare_password = os.environ.get("WEBSHARE_PROXY_PASSWORD")

socks5_proxies = None

if webshare_username and webshare_password:
    ytt_api = YouTubeTranscriptApi(
        proxy_config=WebshareProxyConfig(
            proxy_username=webshare_username,
            proxy_password=webshare_password,
        )
    )
    socks5 = f"socks5://{webshare_username}-rotate:{webshare_password}@p.webshare.io:80"
    socks5_proxies = {
        "http": socks5,
        "https": socks5
    }
else:
    ytt_api = YouTubeTranscriptApi()

# Language code to name mapping
LANGUAGE_NAMES = {
    'en': 'English',
    'vi': 'Vietnamese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'id': 'Indonesian',
}


def get_language_name(code: str | None) -> str | None:
    """Convert language code to full language name."""
    if not code:
        return None
    return LANGUAGE_NAMES.get(code, code)  # Fallback to code if not found


app = FastAPI(docs_url="/swagger", title="YouAPI", description="YouTube Learning API")

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes that don't require authentication
PUBLIC_ROUTES = ["/", "/swagger", "/openapi.json"]


@app.middleware("http")
async def clerk_auth_middleware(request: Request, call_next):
    """Middleware to verify Clerk JWT tokens for all protected routes."""
    # Skip auth for public routes
    if request.url.path in PUBLIC_ROUTES:
        return await call_next(request)

    # Verify the token
    request_state = clerk.authenticate_request(request, AuthenticateRequestOptions())

    if not request_state.is_signed_in:
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized: Invalid or missing authentication token"},
        )

    # Store user info in request state for use in endpoints
    request.state.auth = request_state
    return await call_next(request)


# Enums
class ModelName(str, Enum):
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4O = "gpt-4o"
    GPT_51 = "gpt-5.1"


class DetailLevel(str, Enum):
    TLDR = "tldr"
    SUMMARY = "summary"


# Request/Response Models
class TranscriptSegment(BaseModel):
    text: str
    start: float
    duration: float


class VideoInfoResponse(BaseModel):
    video_id: str
    title: str
    author: str
    thumbnail_url: str
    length: int  # in seconds


class TranscriptResponse(BaseModel):
    video_id: str
    language: str
    language_code: str
    is_generated: bool
    segments: list[TranscriptSegment]


class SummarizeRequest(BaseModel):
    video_id: str
    transcript: str | None = None  # Optional: pass transcript to avoid re-fetching
    model: ModelName = ModelName.GPT_51
    language: str | None = None  # Optional: language for the summary output
    detail_level: DetailLevel = DetailLevel.SUMMARY  # Summary detail level


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
    transcript: str | None = None  # Optional: pass transcript to avoid re-fetching
    model: ModelName = ModelName.GPT_51
    language: str | None = None  # Optional: language for the response


class SuggestQuestionsRequest(BaseModel):
    video_id: str
    transcript: str
    model: ModelName = ModelName.GPT_51
    language: str | None = None  # Optional: language for the questions


class SuggestQuestionsResponse(BaseModel):
    video_id: str
    questions: list[str]


class SuggestedQuestionsSchema(BaseModel):
    """Schema for generate_object to return structured questions."""

    questions: list[str]


class Chapter(BaseModel):
    title: str
    start: float  # start time in seconds


class ChaptersSchema(BaseModel):
    """Schema for generate_object to return structured chapters."""

    chapters: list[Chapter]


class GenerateChaptersRequest(BaseModel):
    video_id: str
    segments: list[TranscriptSegment]
    model: ModelName = ModelName.GPT_51
    language: str | None = None  # Optional: language for the chapter titles


class GenerateChaptersResponse(BaseModel):
    video_id: str
    chapters: list[Chapter]


# YouTube URL parsing utility
def extract_video_id(video_id_or_url: str) -> str:
    """
    Extract YouTube video ID from various URL formats or return as-is if already an ID.

    Supported formats:
    - youtube.com/watch?v=VIDEO_ID
    - youtu.be/VIDEO_ID
    - youtube.com/embed/VIDEO_ID
    - youtube.com/shorts/VIDEO_ID
    - youtube.com/live/VIDEO_ID
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
        r"(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})",  # youtube.com/live/
    ]

    for pattern in patterns:
        match = re.search(pattern, video_id_or_url)
        if match:
            return match.group(1)

    raise ValueError(f"Could not extract video ID from: {video_id_or_url}")


def get_video_title(video_id: str) -> str:
    """Fetch video title from YouTube."""
    try:
        yt = YouTube(f"https://www.youtube.com/watch?v={video_id}")
        return yt.title
    except Exception:
        return "Unknown Title"


def fetch_transcript_text(video_id: str) -> tuple[str, TranscriptResponse]:
    """Fetch transcript and return both raw text and structured response."""
    try:
        actual_video_id = extract_video_id(video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
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


@app.get("/youtube/info", response_model=VideoInfoResponse)
def get_video_info(
    video_id: str = Query(..., description="YouTube video ID or URL"),
):
    """
    Get metadata for a YouTube video.

    - **video_id**: YouTube video ID or full URL (supports youtube.com/watch, youtu.be, embed, shorts)
    """
    try:
        actual_video_id = extract_video_id(video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        yt = YouTube(f"https://www.youtube.com/watch?v={actual_video_id}", proxies=socks5_proxies)
        return VideoInfoResponse(
            video_id=actual_video_id,
            title=yt.title or "Unknown Title",
            author=yt.author or "Unknown Author",
            thumbnail_url=yt.thumbnail_url or "",
            length=yt.length or 0,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch video info: {str(e)}",
        )


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
        # Always get list of available transcripts first
        transcript_list = ytt_api.list(actual_video_id)

        # Extract available language codes
        available_languages = [t.language_code for t in transcript_list]

        if not available_languages:
            raise NoTranscriptFound(actual_video_id)

        # Determine which language to use (priority: target → English → first available)
        selected_language = None

        if lang and lang in available_languages:
            # Priority 1: Use target language if available
            selected_language = lang
        elif 'en' in available_languages:
            # Priority 2: Fallback to English if available
            selected_language = 'en'
        else:
            # Priority 3: Use first available
            selected_language = available_languages[0]

        transcript = ytt_api.fetch(actual_video_id, languages=[selected_language])

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


def get_summary_prompt(detail_level: DetailLevel, transcript_text: str, language_instruction: str) -> str:
    """Generate summary prompt based on detail level."""
    base_rules = """Rules:
- Use markdown: bullet points, **bold** for emphasis
- Start directly with content - no introductions like "This video discusses..."
- No filler or verbatim transcript
- Use **bold** only for key terms, not entire sentences"""

    if detail_level == DetailLevel.TLDR:
        instruction = """List the key insights from this video as bullet points.

Goal: Give readers a high-level understanding of the whole content.
- Each bullet = one key insight or takeaway
- Focus on what important that the viewer should know
- No topic headers, just a flat list of insights
- Skip examples and explanations
- Keep between 5-12 bullet points, each at a reasonable length for easy reading & digest"""

    else:  # SUMMARY (default)
        instruction = """Go through each logical topic or section discussed in the video.

For each topic:
- Use a header (###) for the topic name
- List only 2-3 important points as flat bullet points
- NO nested bullets, NO sub-points

Keep it concise — focus on what matters most."""

    return f"""{instruction}

{base_rules}{language_instruction}

Transcript:
{transcript_text}"""


@app.post("/summarize")
async def summarize_video(request: SummarizeRequest):
    """
    Generate a streaming summary of a YouTube video transcript.

    - **video_id**: YouTube video ID or URL
    - **transcript**: Optional transcript text (to avoid re-fetching)
    - **model**: LLM model to use (gpt-5.1 or gpt-4o)
    - **detail_level**: Summary detail level (tldr, key_takeaways, detailed_notes)
    """
    # Use provided transcript or fetch from YouTube
    if request.transcript:
        transcript_text = request.transcript
    else:
        transcript_text, _ = fetch_transcript_text(request.video_id)

    # Generate streaming summary using AI SDK
    try:
        model = openai(request.model.value)

        # Build language instruction if specified
        language_name = get_language_name(request.language)
        language_instruction = f"\n\nIMPORTANT: Write the entire summary in {language_name}." if language_name else ""

        # Get prompt based on detail level
        prompt = get_summary_prompt(request.detail_level, transcript_text, language_instruction)

        async def generate():
            result = stream_text(
                model=model,
                prompt=prompt,
            )
            async for chunk in result.text_stream:
                if chunk:
                    # Encode newlines to preserve them in SSE format
                    encoded = chunk.replace("\n", "\\n")
                    yield f"data: {encoded}\n\n"
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
            detail=f"Failed to generate summary: {str(e)}",
        )


@app.post("/chat")
async def chat_with_video(request: ChatRequest):
    """
    Chat with a YouTube video transcript. Returns a streaming response.

    - **video_id**: YouTube video ID or URL
    - **messages**: Chat history
    - **transcript**: Optional transcript text (to avoid re-fetching)
    - **model**: LLM model to use (gpt-5.1 or gpt-4o)
    """
    # Use provided transcript or fetch from YouTube
    if request.transcript:
        transcript_text = request.transcript
    else:
        transcript_text, _ = fetch_transcript_text(request.video_id)

    # Build language instruction if specified
    language_name = get_language_name(request.language)
    language_instruction = f"\nIMPORTANT: Always respond in {language_name}." if language_name else ""

    # Build messages with system context
    system_prompt = f"""You are a helpful assistant that answers questions about a YouTube video.
Use the following transcript to answer the user's questions accurately and helpfully.
If the answer cannot be found in the transcript, say so clearly.{language_instruction}

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
                    # Encode newlines to preserve them in SSE format
                    encoded = chunk.replace("\n", "\\n")
                    yield f"data: {encoded}\n\n"
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


@app.post("/youtube/suggest-questions", response_model=SuggestQuestionsResponse)
async def suggest_questions(request: SuggestQuestionsRequest):
    """
    Generate suggested questions about a YouTube video transcript.
    Returns 3 short, interesting questions to help users understand the content.

    - **video_id**: YouTube video ID or URL
    - **transcript**: Video transcript text
    - **model**: LLM model to use (gpt-5.1 or gpt-4o)
    """
    try:
        actual_video_id = extract_video_id(request.video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        model = openai(request.model.value)

        # Build language instruction if specified
        language_name = get_language_name(request.language)
        language_instruction = f"\n\nIMPORTANT: Write all questions in {language_name}." if language_name else ""

        result = generate_object(
            model=model,
            schema=SuggestedQuestionsSchema,
            prompt=f"""Based on this video transcript, generate exactly 3 suggested questions that a viewer might want to ask to better understand the content.

Rules:
- Each question should be SHORT (under 10 words if possible)
- Questions should be interesting and thought-provoking
- Focus on key concepts, insights, or practical applications
- Make questions specific to the video content, not generic
- If the transcript contains claims, opinions, or criticism, include questions that encourage critical evaluation
- Consider broader perspectives - help viewers question authenticity and think beyond what's presented{language_instruction}

Transcript:
{request.transcript[:8000]}""",
        )

        # Get questions directly from structured output
        questions = result.object.questions[:3]

        return SuggestQuestionsResponse(
            video_id=actual_video_id,
            questions=questions,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate suggested questions: {str(e)}",
        )


@app.post("/youtube/generate-chapters", response_model=GenerateChaptersResponse)
async def generate_chapters(request: GenerateChaptersRequest):
    """
    Generate logical chapters from video transcript segments.
    Uses AI to identify natural topic breaks and create meaningful chapter titles.

    - **video_id**: YouTube video ID or URL
    - **segments**: List of transcript segments with text, start time, and duration
    - **model**: LLM model to use (gpt-5.1 or gpt-4o)
    """
    try:
        actual_video_id = extract_video_id(request.video_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Format segments with timestamps for the LLM
    formatted_segments = "\n".join(
        f"[{seg.start}] {seg.text}"
        for seg in request.segments
    )

    try:
        model = openai(request.model.value)

        # Build language instruction if specified
        language_name = get_language_name(request.language)
        language_instruction = f"\n\nIMPORTANT: Write all chapter titles in {language_name}." if language_name else ""

        result = generate_object(
            model=model,
            schema=ChaptersSchema,
            prompt=f"""Analyze this video transcript and divide it into logical chapters.

Step 1: Determine the appropriate number of chapters
- Read through the transcript and identify natural topic transitions
- Each chapter should represent a distinct, meaningful section of content
- Don't artificially limit or inflate the number - let the content dictate

Step 2: Generate the chapters
- Each chapter title should be SHORT (3-7 words), descriptive, and capture the main topic
- The start time MUST be an exact timestamp from the transcript where a new topic begins
- First chapter should start at 0.0 or very close to it
- Titles should be engaging and informative (like YouTube chapter titles){language_instruction}

Transcript with timestamps:
{formatted_segments}
""",
        )

        return GenerateChaptersResponse(
            video_id=actual_video_id,
            chapters=result.object.chapters,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate chapters: {str(e)}",
        )
