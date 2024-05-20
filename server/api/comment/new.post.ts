type commentRequest = {
  content: string;
  pid: string;
};

function extractMentions(text: string) {
  // 使用正则表达式匹配前后为空格或行首行尾的@用户
  const mentionPattern = /(^|\s)@\w+(\s|$)/g;
  const matches = text.match(mentionPattern);
  // 去除前后的空格
  const mentions = matches ? matches.map((mention) => mention.trim()) : [];
  return mentions;
}

export default defineEventHandler(async (event) => {
  if (!event.context.uid) {
    sendRedirect(event,'/user/login')
  }
  const request = (await readBody(event)) as commentRequest;
  if (!request.content) {
    throw createError("评论内容不能为空");
  }

  const mentioned = extractMentions(request.content);
  const cid = `c${randomId()}`;

  await prisma.comment.create({
    data: {
      content: request.content,
      cid,
      pid: request.pid,
      uid: event.context.uid,
      mentioned: mentioned.join(","),
    },
  });

  await prisma.user.update({
    where: {
      uid: event.context.uid,
    },
    data: {
      commentCount: {
        increment: 1,
      },
    },
  });

  await prisma.post.update({
    where: {
      pid: request.pid,
    },
    data: {
      replyCount: {
        increment: 1,
      },
    },
  });

  return { success: true };
});