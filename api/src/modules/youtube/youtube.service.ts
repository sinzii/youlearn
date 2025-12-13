import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { YoutubeTranscript } from 'youtube-transcript';
import { extractVideoId } from './utils/youtube-url.util';

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
  async getTranscript(
    videoIdOrUrl: string,
    lang?: string,
  ): Promise<TranscriptResult> {
    const videoId = extractVideoId(videoIdOrUrl);

    if (!videoId) {
      throw new BadRequestException('Invalid YouTube URL or video ID');
    }

    try {
      const config = lang ? { lang } : undefined;
      const transcriptData = await YoutubeTranscript.fetchTranscript(
        videoId,
        config,
      );

      if (!transcriptData || transcriptData.length === 0) {
        throw new NotFoundException(
          `No transcript found for video: ${videoId}`,
        );
      }

      const segments: TranscriptSegment[] = transcriptData.map((item) => ({
        text: item.text,
        duration: item.duration,
        offset: item.offset,
      }));

      // Calculate total duration from segments
      const lastSegment = segments[segments.length - 1];
      const totalDuration = lastSegment.offset + lastSegment.duration;

      return {
        videoId,
        segments,
        totalDuration,
        language: lang,
      };
    } catch (error) {
      // Re-throw NestJS exceptions
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
        errorMessage.toLowerCase().includes('video unavailable')
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

      if (errorMessage.toLowerCase().includes('language')) {
        throw new BadRequestException(
          `Transcript not available in requested language for video: ${videoId}`,
        );
      }

      throw new BadRequestException(
        `Failed to fetch transcript: ${errorMessage}`,
      );
    }
  }
}
