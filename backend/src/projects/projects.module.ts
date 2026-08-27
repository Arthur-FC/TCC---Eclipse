import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ConversationEntity } from './conversation.entity';
import { MessageEntity } from './message.entity';
import { ProjectEntity } from './project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      ProjectEntity,
      ConversationEntity,
      MessageEntity,
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
