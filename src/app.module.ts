import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
