# YouLearn

A fullstack web application for extracting and displaying YouTube video transcripts.

## Project Structure

```
youlearn/
├── api/                    # NestJS backend API (port 3000)
│   └── src/modules/youtube/  # YouTube transcript extraction feature
├── youapi/                 # FastAPI backend API (port 8000)
│   └── main.py             # YouTube transcript extraction endpoint
└── web/                    # Next.js frontend (React 19, Tailwind CSS v4)
```

## Tech Stack

- **Backend (NestJS)**: NestJS 11, TypeScript, youtubei.js for transcript extraction
- **Backend (FastAPI)**: Python 3.12, FastAPI, youtube-transcript-api
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Package Managers**: pnpm (Node.js), uv (Python)

## Development Commands

### API (`/api`)
```bash
pnpm run start:dev     # Development with watch mode
pnpm run build         # Compile TypeScript
pnpm run test          # Run unit tests
pnpm run lint          # Lint and fix
```

### Web (`/web`)
```bash
pnpm run dev           # Development server
pnpm run build         # Production build
pnpm run lint          # Run ESLint
```

### YouAPI (`/youapi`)
```bash
uv run uvicorn main:app --reload   # Development server (port 8000)
uv run ruff check                  # Lint
uv run pytest                      # Run tests
```

## Architecture Patterns

### Backend (NestJS)
- Module-based organization with dependency injection
- Global ValidationPipe with strict settings (whitelist, forbidNonWhitelisted, transform)
- Custom validators for YouTube URL/ID validation
- DTOs with class-validator decorators
- Swagger/OpenAPI documentation

### Backend (FastAPI)
- Single-file application (`main.py`)
- Pydantic models for request/response validation
- Swagger UI at `/swagger`, ReDoc at `/redoc`
- youtube-transcript-api for transcript extraction

### Frontend (Next.js)
- App Router pattern (app/ directory)
- Tailwind CSS v4 with CSS variables for theming
- Dark mode support via prefers-color-scheme

## Key Files

- `api/src/modules/youtube/youtube.service.ts` - Core transcript extraction logic (NestJS)
- `api/src/modules/youtube/utils/youtube-url.util.ts` - YouTube URL parsing utilities (NestJS)
- `api/src/modules/youtube/dto/get-transcript.dto.ts` - Request validation (NestJS)
- `youapi/main.py` - FastAPI application with transcript endpoint
- `web/app/page.tsx` - Frontend home page

## API Endpoints

### NestJS API (port 3000)
- `GET /youtube/transcript?videoId={id}&lang={optional}` - Extract transcript from YouTube video

### FastAPI YouAPI (port 8000)
- `GET /youtube/transcript?video_id={id}&lang={optional}` - Extract transcript from YouTube video
  - Supports: youtube.com/watch, youtu.be, embed, shorts URLs, or direct video IDs
