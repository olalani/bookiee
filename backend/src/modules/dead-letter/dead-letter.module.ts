import { Module } from '@nestjs/common';
import { DeadLetterService } from './dead-letter.service';
import { DeadLetterController } from './dead-letter.controller';

@Module({
  providers: [DeadLetterService],
  controllers: [DeadLetterController],
})
export class DeadLetterModule {}
