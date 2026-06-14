// src/lib/r2.ts — Cloudflare R2 上传工具
// 用 AWS SDK（S3 兼容 API）
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

let _r2: S3Client | null = null;
let _warned = false;

function getR2(): S3Client {
  if (_r2) return _r2;
  if (!_warned) {
    for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_HOST']) {
      if (!process.env[k]) {
        console.warn(`[r2] missing env ${k} — image upload will fail until set`);
      }
    }
    _warned = true;
  }
  _r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });
  return _r2;
}

export const R2_BUCKET = process.env.R2_BUCKET || '';
export const R2_PUBLIC_HOST = process.env.R2_PUBLIC_HOST || '';
export const r2 = new Proxy({} as S3Client, { get: (_t, prop) => (getR2() as any)[prop] });

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export async function uploadToR2(
  file: Buffer,
  mimeType: string,
  originalName: string
): Promise<UploadResult> {
  const ext = originalName.split('.').pop()?.toLowerCase().slice(0, 8) || 'bin';
  const key = `posts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: file,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    url: `${R2_PUBLIC_HOST.replace(/\/$/, '')}/${key}`,
    key,
    size: file.length,
    mimeType,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

export function keyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_HOST) return null;
  const prefix = R2_PUBLIC_HOST.replace(/\/$/, '') + '/';
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
