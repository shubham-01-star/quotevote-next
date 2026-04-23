import { logger } from '~/data/utils/logger';
import { logActivity } from '~/data/resolvers/utils/activities';
import Group from '~/data/models/Group';
import Post from '~/data/models/Post';
import MessageRoom from '~/data/models/MessageRoom';
import type { ResolverFn } from '~/types/graphql';
import type * as Common from '~/types/common';

const URL_REGEX = /(?:https?:\/\/|ftp:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
const INVALID_URL_CHARS_REGEX = /[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]/;

function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (EMOJI_REGEX.test(trimmed)) return null;
  if (INVALID_URL_CHARS_REGEX.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:', 'ftp:'].includes(parsed.protocol)) return null;
    if (!parsed.hostname || parsed.hostname.length < 3) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export const addPost: ResolverFn<Common.Post, unknown, { post: Common.PostInput }> = async (
  _,
  args
) => {
  logger.info('Function: addPost', { args });

  URL_REGEX.lastIndex = 0;
  if (URL_REGEX.test(args.post.text)) {
    logger.warn('Post rejected: URL detected in body', { text: args.post.text });
    throw new Error('Post body cannot contain links. Please use the Citation field.');
  }

  let sanitizedCitationUrl: string | null = null;
  if (args.post.citationUrl) {
    sanitizedCitationUrl = sanitizeUrl(args.post.citationUrl);
    if (!sanitizedCitationUrl) {
      logger.warn('Post rejected: Invalid citationUrl', { citationUrl: args.post.citationUrl });
      throw new Error(
        'Invalid citation URL. Only standard URL characters are allowed (no emojis or special characters).'
      );
    }
  }

  const group = await Group.findById(args.post.groupId);
  if (!group) {
    throw new Error('Group not found. Please select a valid group.');
  }

  const titleSlug = args.post.title.replace(/ /g, '-').toLowerCase();

  try {
    const newPost = await new Post({
      ...args.post,
      url: '',
      citationUrl: sanitizedCitationUrl,
    }).save();

    const url = `/post${group.url}/${titleSlug}/${newPost._id}`;
    await Post.findByIdAndUpdate(newPost._id, { url });
    newPost.url = url;

    await MessageRoom.create({
      users: [newPost.userId],
      postId: newPost._id,
      messageType: 'POST',
    });

    await logActivity(
      'POSTED',
      { postId: String(newPost._id), userId: String(newPost.userId) },
      newPost.title
    );

    return newPost as unknown as Common.Post;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
};
