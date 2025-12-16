# YouLearn

A fullstack application for learning from YouTube videos with AI-powered summaries and chat.

## Project Structure

```
youlearn/
├── api/                    # NestJS backend API (port 3000)
│   └── src/modules/youtube/  # YouTube transcript extraction feature
├── youapi/                 # FastAPI backend API (port 8000)
│   └── main.py             # YouTube transcript, summarize, chat endpoints
├── web/                    # Next.js frontend (React 19, Tailwind CSS v4)
└── mobile/                 # Expo React Native app (iOS, Android, Web)
    ├── app/                # Expo Router (file-based routing)
    ├── components/         # Reusable UI components
    ├── hooks/              # Custom React hooks
    └── constants/          # Theme and app constants
```

## Tech Stack

- **Backend (NestJS)**: NestJS 11, TypeScript, youtubei.js for transcript extraction
- **Backend (FastAPI)**: Python 3.12, FastAPI, youtube-transcript-api, ai-sdk-python
- **Frontend (Web)**: Next.js 16, React 19, Tailwind CSS v4
- **Frontend (Mobile)**: Expo 54, React Native 0.81, React 19, TypeScript
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

### Mobile (`/mobile`)
```bash
pnpm start              # Start Expo development server
pnpm run android        # Run on Android emulator
pnpm run ios            # Run on iOS simulator
pnpm run web            # Run on web browser
pnpm run lint           # Run ESLint
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

### Frontend (Mobile - Expo)
- Expo Router for file-based navigation (app/ directory)
- Bottom tab navigation with Home and Explore screens
- Themed components (ThemedText, ThemedView) for light/dark mode
- Platform-specific code via file extensions (*.ios.tsx, *.web.ts)
- Custom hooks for color scheme and theme colors

## Key Files

- `api/src/modules/youtube/youtube.service.ts` - Core transcript extraction logic (NestJS)
- `api/src/modules/youtube/utils/youtube-url.util.ts` - YouTube URL parsing utilities (NestJS)
- `api/src/modules/youtube/dto/get-transcript.dto.ts` - Request validation (NestJS)
- `youapi/main.py` - FastAPI application with transcript, summarize, chat endpoints
- `web/app/page.tsx` - Web frontend home page
- `web/app/components/SummaryChat.tsx` - Summary and chat combined component
- `mobile/app/(tabs)/_layout.tsx` - Mobile tab navigator configuration
- `mobile/app/(tabs)/index.tsx` - Mobile home screen
- `mobile/constants/theme.ts` - Mobile theme configuration (colors, fonts)

## API Endpoints

### NestJS API (port 3000)
- `GET /youtube/transcript?videoId={id}&lang={optional}` - Extract transcript from YouTube video

### FastAPI YouAPI (port 8000)
- `GET /youtube/transcript?video_id={id}&lang={optional}` - Extract transcript from YouTube video
  - Supports: youtube.com/watch, youtu.be, embed, shorts URLs, or direct video IDs
- `POST /summarize` - Generate streaming summary of video transcript (SSE)
- `POST /chat` - Chat with video content using transcript context (SSE)
