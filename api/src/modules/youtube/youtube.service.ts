import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { extractVideoId } from './utils/youtube-url.util';
import { INNERTUBE_TOKEN } from './youtube.constants';

export interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

export interface TranscriptResult {
  videoId: string;
  segments: TranscriptSegment[];
  totalDuration: number;
  language?: string;
}

@Injectable()
export class YoutubeService {
  constructor(@Inject(INNERTUBE_TOKEN) private readonly innertube: any) {}

  async getTranscript(
    videoIdOrUrl: string,
    lang?: string,
  ): Promise<TranscriptResult> {
    const videoId = extractVideoId(videoIdOrUrl);

    if (!videoId) {
      throw new BadRequestException('Invalid YouTube URL or video ID');
    }

    try {
      const info = await this.innertube.getInfo(videoId);
      const transcriptInfo = await info.getTranscript();

      if (!transcriptInfo) {
        throw new NotFoundException(
          `No transcript available for video: ${videoId}`,
        );
      }

      const transcriptContent =
        transcriptInfo.transcript?.content?.body?.initial_segments;

      if (!transcriptContent || transcriptContent.length === 0) {
        throw new NotFoundException(
          `No transcript segments found for video: ${videoId}`,
        );
      }

      const segments: TranscriptSegment[] = transcriptContent.map(
        (segment: any) => {
          const startMs = parseInt(segment.start_ms || '0', 10);
          const endMs = parseInt(segment.end_ms || '0', 10);
          return {
            text: segment.snippet?.text || '',
            offset: startMs / 1000,
            duration: (endMs - startMs) / 1000,
          };
        },
      );

      const lastSegment = segments[segments.length - 1];
      const totalDuration = lastSegment.offset + lastSegment.duration;

      return {
        videoId,
        segments,
        totalDuration,
        language: lang,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (
        errorMessage.toLowerCase().includes('disabled') ||
        errorMessage.toLowerCase().includes('transcripts are disabled')
      ) {
        throw new BadRequestException(
          `Transcripts are disabled for this video: ${videoId}`,
        );
      }

      if (
        errorMessage.toLowerCase().includes('unavailable') ||
        errorMessage.toLowerCase().includes('video unavailable') ||
        errorMessage.toLowerCase().includes('not found')
      ) {
        throw new NotFoundException(
          `Video is unavailable or does not exist: ${videoId}`,
        );
      }

      if (
        errorMessage.toLowerCase().includes('not available') ||
        errorMessage.toLowerCase().includes('no transcript')
      ) {
        throw new NotFoundException(
          `No transcript available for video: ${videoId}`,
        );
      }

      throw new BadRequestException(
        `Failed to fetch transcript: ${errorMessage}`,
      );
    }
  }
}
