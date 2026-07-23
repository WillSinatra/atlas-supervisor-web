import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), 'uploads');

@Injectable()
export class StorageService {
  async save(orderId: string, buffer: Buffer, originalName: string): Promise<string> {
    const dir = path.join(UPLOAD_ROOT, 'orders', orderId);
    await fs.mkdir(dir, { recursive: true });
    const ext = path.extname(originalName) || '';
    const filename = `${randomUUID()}${ext}`;
    const fullPath = path.join(dir, filename);
    await fs.writeFile(fullPath, buffer);
    return path.relative(UPLOAD_ROOT, fullPath).split(path.sep).join('/');
  }

  async read(storageKey: string): Promise<Buffer> {
    const fullPath = path.join(UPLOAD_ROOT, storageKey);
    return fs.readFile(fullPath);
  }
}
