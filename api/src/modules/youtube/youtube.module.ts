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
        const { Innertube, Log } = await import('youtubei.js');
        Log.setLevel(Log.Level.NONE);
        return await Innertube.create();
      },
    },
    YoutubeService,
  ],
  exports: [YoutubeService],
})
export class YoutubeModule {}
