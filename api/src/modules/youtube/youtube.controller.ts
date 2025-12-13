import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { YoutubeService, TranscriptResult } from './youtube.service';
import { GetTranscriptDto } from './dto/get-transcript.dto';

@ApiTags('YouTube')
@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('transcript')
  @ApiOperation({ summary: 'Get transcript from a YouTube video' })
  @ApiResponse({
    status: 200,
    description: 'Transcript fetched successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid video ID/URL or transcripts disabled',
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found or no transcript available',
  })
  async getTranscript(
    @Query() query: GetTranscriptDto,
  ): Promise<TranscriptResult> {
    return this.youtubeService.getTranscript(query.videoId, query.lang);
  }
}
