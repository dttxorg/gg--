// src/lib/r2.ts — Cloudflare R2 上传工具
// 注意：此文件被 build 阶段扫描时不能执行任何 Node-only 代码
// 所有 S3Client 初始化都放在函数内部（运行时才执行）
// build 时 import 这个文件 = 只导入类型，不创建 client

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
  // 动态 import：build 时不执行
  const [{ S3Client, PutObjectCommand }, { randomUUID }] = await Promise.all([
    import('@aws-sdk/client-s3'),
    import('node:crypto'),
  ]);

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 凭证未配置');
  }
  const bucket = process.env.R2_BUCKET || '';
  const publicHost = (process.env.R2_PUBLIC_HOST || '').replace(/\/$/, '');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const ext = originalName.split('.').pop()?.toLowerCase().slice(0, 8) || 'bin';
  const key = `posts/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return {
    url: `${publicHost}/${key}`,
    key,
    size: file.length,
    mimeType,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  if (!process.env.R2_ACCOUNT_ID) return;
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET || '', Key: key }));
}

export function keyFromUrl(url: string): string | null {
  const publicHost = (process.env.R2_PUBLIC_HOST || '').replace(/\/$/, '');
  if (!publicHost) return null;
  const prefix = publicHost + '/';
  if (!url.startsWith(prefix)) return null;
  return url.slice(prefix.length);
}
