import { Prisma } from "@prisma/client";

type ListPostRequest = {
  page: number;
  size: number;
  username: string;
};

export default defineEventHandler(async (event) => {
  const request = (await readBody(event)) as ListPostRequest;

  const where: Prisma.PostWhereInput = {};
  const user = await prisma.user.findUnique({
    where: { username: request.username },
  });
  if (!user) {
    throw createError("用户不存在");
  }

  if (request.page <= 0 && !request.page) {
    request.page = 1;
  }
  if (request.size <= 0 && !request.size) {
    request.size = 20;
  }
  where.uid = user.uid;
  where.fav = {
    some:{
      userId: user.id
    }
  }

  let posts = await prisma.post.findMany({
    where,
    include: {
      _count: {
        select: {
          comments: true,
        },
      },
      author: {
        select: {
          uid: true,
          avatarUrl: true,
          username: true,
        },
      },
      tags: true,
      comments: false,
      fav: {
        select: {
          userId: true,
          postId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },

    skip: (request.page - 1) * request.size,
    take: request.size,
  });
  const total = await prisma.post.count({
    where,
  });

  return {
    success: true,
    posts,
    total,
  };
});
