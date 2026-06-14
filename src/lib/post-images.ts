import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

const DRAFT_KEY_RE = /^[a-zA-Z0-9_-]{8,80}$/;

export function isValidDraftKey(draftKey: string | null | undefined) {
  return !!draftKey && DRAFT_KEY_RE.test(draftKey);
}

export function draftTitle(userId: string, draftKey: string) {
  return `__draft__:${userId}:${draftKey}`;
}

export async function getOrCreateDraftPost(db: DbClient, userId: string, draftKey: string) {
  if (!isValidDraftKey(draftKey)) {
    throw new Error('invalid draft key');
  }

  const title = draftTitle(userId, draftKey);
  const existing = await db.post.findFirst({
    where: { title, authorId: userId, isDeleted: true },
  });
  if (existing) return existing;

  let platform = await db.platform.findFirst({ where: { slug: 'xiaohongshu' } });
  if (!platform) {
    platform = await db.platform.create({
      data: { slug: 'xiaohongshu', name: '小红书', emoji: '📕', order: 1 },
    });
  }

  return db.post.create({
    data: {
      platformId: platform.id,
      title,
      contentHtml: '<p></p>',
      contentText: '',
      isDeleted: true,
      authorId: userId,
    },
  });
}

export async function attachImagesToPost(
  db: Prisma.TransactionClient,
  options: {
    imageIds: string[];
    postId: string;
    userId: string;
    draftKey?: string | null;
  },
) {
  const uniqueIds = Array.from(new Set(options.imageIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  const draft = isValidDraftKey(options.draftKey)
    ? draftTitle(options.userId, options.draftKey!)
    : null;

  const images = await db.postImage.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          authorId: true,
          isDeleted: true,
        },
      },
    },
  });

  if (images.length !== uniqueIds.length) {
    throw new Error('invalid image id');
  }

  for (const img of images) {
    const belongsToPost = img.postId === options.postId;
    const belongsToDraft =
      !!draft &&
      img.post.title === draft &&
      img.post.authorId === options.userId &&
      img.post.isDeleted;

    if (!belongsToPost && !belongsToDraft) {
      throw new Error('image does not belong to this draft or post');
    }
  }

  for (const [order, imageId] of uniqueIds.entries()) {
    await db.postImage.update({
      where: { id: imageId },
      data: { postId: options.postId, order },
    });
  }

  if (draft) {
    const draftPost = await db.post.findFirst({
      where: { title: draft, authorId: options.userId, isDeleted: true },
      select: { id: true },
    });
    if (draftPost) {
      const remaining = await db.postImage.count({ where: { postId: draftPost.id } });
      if (remaining === 0) {
        await db.post.delete({ where: { id: draftPost.id } }).catch(() => {});
      }
    }
  }
}
