import { Module } from '@nestjs/common';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';
import { INNERTUBE_TOKEN } from './youtube.constants';

@Module({
  controllers: [YoutubeController],
  providers: [
    {
      provide: INNERTUBE_TOKEN,
      useFactory: async () => {
        const { Innertube } = await import('youtubei.js');
        return await Innertube.create();
      },
    },
    YoutubeService,
  ],
  exports: [YoutubeService],
})
export class YoutubeModule {}
