# YouLearn

A fullstack web application for extracting and displaying YouTube video transcripts.

## Project Structure

```
youlearn/
├── api/                    # NestJS backend API (port 3000)
│   └── src/modules/youtube/  # YouTube transcript extraction feature
└── web/                    # Next.js frontend (React 19, Tailwind CSS v4)
```

## Tech Stack

- **Backend**: NestJS 11, TypeScript, youtubei.js for transcript extraction
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4
- **Package Manager**: pnpm

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

## Architecture Patterns

### Backend (NestJS)
- Module-based organization with dependency injection
- Global ValidationPipe with strict settings (whitelist, forbidNonWhitelisted, transform)
- Custom validators for YouTube URL/ID validation
- DTOs with class-validator decorators
- Swagger/OpenAPI documentation

### Frontend (Next.js)
- App Router pattern (app/ directory)
- Tailwind CSS v4 with CSS variables for theming
- Dark mode support via prefers-color-scheme

## Key Files

- `api/src/modules/youtube/youtube.service.ts` - Core transcript extraction logic
- `api/src/modules/youtube/utils/youtube-url.util.ts` - YouTube URL parsing utilities
- `api/src/modules/youtube/dto/get-transcript.dto.ts` - Request validation
- `web/app/page.tsx` - Frontend home page

## API Endpoints

- `GET /youtube/transcript?videoId={id}&lang={optional}` - Extract transcript from YouTube video
  - Supports: youtube.com/watch, youtu.be, embed, shorts URLs, or direct video IDs
