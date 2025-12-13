import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { isValidYoutubeInput } from '../utils/youtube-url.util';

@ValidatorConstraint({ name: 'isValidYoutubeInput', async: false })
export class IsValidYoutubeInputConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidYoutubeInput(value);
  }

  defaultMessage(): string {
    return 'Invalid YouTube URL or video ID. Please provide a valid YouTube video URL or an 11-character video ID.';
  }
}

export class GetTranscriptDto {
  @ApiProperty({
    description: 'YouTube video URL or 11-character video ID',
    example: 'dQw4w9WgXcQ',
  })
  @IsString()
  @IsNotEmpty({ message: 'Video URL or ID is required' })
  @Validate(IsValidYoutubeInputConstraint)
  videoId: string;

  @ApiPropertyOptional({
    description: 'Language code for transcript (e.g., en, es, fr)',
    example: 'en',
  })
  @IsOptional()
  @IsString()
  lang?: string;
}
