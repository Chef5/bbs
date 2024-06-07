interface req {
  page: number
  size: number
  count?: boolean
}

export default defineEventHandler(async (event) => {
  const pid = getRouterParam(event, 'pid')
  const body = (await readBody(event)) as req
  if (!pid) {
    throw createError('不存在的帖子')
  }

  const page = (body.page as number) || 1
  const size = (body.size as number) || 20
  const uid = event.context.uid

  if (body.count) {
    await prisma.post.update({
      where: {
        pid,
      },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    })
  }

  const post = await prisma.post.findFirst({
    where: {
      pid,
    },
    include: {
      lastCommentUser: {
        select: {
          uid: true,
          username: true,
        },
      },
      PostSupport: true,
      author: {
        select: {
          username: true,
          avatarUrl: true,
          headImg: true,
          uid: true,
          role: true,
          signature: true,
        },
      },
      tag: true,
      comments: {
        select: {
          id: false,
          createdAt: true,
          floor: true,
          content: true,
          pid: true,
          uid: true,
          cid: true,
          updatedAt: true,
          mentioned: true,
          post: {
            select: {
              pid: true,
              uid: true,
            },
          },
          author: {
            select: {
              uid: true,
              username: true,
              avatarUrl: true,
              headImg: true,
              role: true,
              signature: true,
            },
          },
          likes: {
            where: {
              uid,
            },
            select: {
              uid: true,
              cid: true,
            },
          },
          dislikes: {
            where: {
              uid,
            },
            select: {
              uid: true,
              cid: true,
            },
          },
          _count: {
            select: {
              likes: true,
              dislikes: true,
            },
          },
        },
        take: size,
        skip: (page - 1) * size,
        orderBy: {
          createdAt: 'asc',
        },
      },
      fav: true,
      _count: {
        select: {
          comments: true,
          PostSupport: true,
        },
      },
    },
  })

  if (uid) {
    const unReadCount = await prisma.message.count({
      where: {
        toUid: uid,
        read: false,
        relationId: pid,
      },
    })
    if (unReadCount > 0) {
      await prisma.message.updateMany({
        where: {
          toUid: uid,
          read: false,
          relationId: pid,
        },
        data: {
          read: true,
        },
      })
    }
  }

  const res = {
    success: true,
    post: {
      ...post,
      support: uid ? post!.PostSupport.length! > 0 : false,
      fav: uid ? post!.fav.length! > 0 : false,
      comments: post?.comments.map(comment => ({
        ...comment,
        like: uid ? comment.likes.length > 0 : false,
        dislike: uid ? comment.dislikes.length > 0 : false,
        likeCount: comment._count.likes,
        dislikeCount: comment._count.dislikes,
      })),
    },
  }

  return res
})
