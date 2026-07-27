import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { FilesController } from './files.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [StorageService],
  exports: [StorageService],
})
export class FilesModule {}
