/**
 * Prisma Dependent Models — Relationship CRUD Tests
 *
 * Tests Create, Read, Update, Delete operations and relationship traversal
 * for all dependent domain models defined in prisma/schema/*.prisma.
 *
 * Requires a running MongoDB instance with DATABASE_URL in .env
 *
 * Run: npx jest __tests__/integration/prisma-dependent-models.test.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Typed delete functions for cleanup — no `any` needed
const deleteFns: Record<string, (id: string) => Promise<unknown>> = {
  user: (id) => prisma.user.delete({ where: { id } }),
  group: (id) => prisma.group.delete({ where: { id } }),
  post: (id) => prisma.post.delete({ where: { id } }),
  comment: (id) => prisma.comment.delete({ where: { id } }),
  quote: (id) => prisma.quote.delete({ where: { id } }),
  vote: (id) => prisma.vote.delete({ where: { id } }),
  voteLog: (id) => prisma.voteLog.delete({ where: { id } }),
  reaction: (id) => prisma.reaction.delete({ where: { id } }),
  message: (id) => prisma.message.delete({ where: { id } }),
  messageRoom: (id) => prisma.messageRoom.delete({ where: { id } }),
  presence: (id) => prisma.presence.delete({ where: { id } }),
  roster: (id) => prisma.roster.delete({ where: { id } }),
  typing: (id) => prisma.typing.delete({ where: { id } }),
  userReport: (id) => prisma.userReport.delete({ where: { id } }),
  activity: (id) => prisma.activity.delete({ where: { id } }),
};

// Track created IDs for cleanup
const cleanup: { model: string; id: string }[] = [];

// Helper to register entities for cleanup (LIFO order)
function track(model: string, id: string) {
  cleanup.unshift({ model, id });
}

// Helper to create a unique test user
async function createTestUser(suffix: string) {
  const user = await prisma.user.create({
    data: {
      email: `test-${suffix}-${Date.now()}@prisma-test.com`,
      username: `testuser_${suffix}_${Date.now()}`,
      name: `Test ${suffix}`,
      accountStatus: 'active',
    },
  });
  track('user', user.id);
  return user;
}

// Helper to create a test group
async function createTestGroup(creatorId: string) {
  const group = await prisma.group.create({
    data: {
      creatorId,
      title: `Test Group ${Date.now()}`,
      privacy: 'public',
    },
  });
  track('group', group.id);
  return group;
}

// Helper to create a test post
async function createTestPost(userId: string, groupId: string) {
  const post = await prisma.post.create({
    data: {
      userId,
      groupId,
      title: `Test Post ${Date.now()}`,
      text: 'Test post content for relationship testing.',
    },
  });
  track('post', post.id);
  return post;
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup in reverse creation order
  for (const { model, id } of cleanup) {
    try {
      const deleteFn = deleteFns[model];
      if (deleteFn) await deleteFn(id);
    } catch {
      // Already deleted or doesn't exist — ignore
    }
  }
  await prisma.$disconnect();
});

// ============================================================================
// 1. User Model
// ============================================================================
describe('User Model', () => {
  it('should create a user with defaults', async () => {
    const user = await createTestUser('user');
    expect(user.id).toBeDefined();
    expect(user.accountStatus).toBe('active');
    expect(user.tokens).toBe(0);
    expect(user.upvotes).toBe(0);
    expect(user.downvotes).toBe(0);
    expect(user.contributorBadge).toBe(false);
    expect(user.isAdmin).toBe(false);
    expect(user.joined).toBeInstanceOf(Date);
  });

  it('should update a user', async () => {
    const user = await createTestUser('userupd');
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { name: 'Updated Name', upvotes: 5 },
    });
    expect(updated.name).toBe('Updated Name');
    expect(updated.upvotes).toBe(5);
  });

  it('should find user by username', async () => {
    const user = await createTestUser('userfind');
    const found = await prisma.user.findUnique({ where: { username: user.username } });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(user.id);
  });
});

// ============================================================================
// 2. Post → User, Group relationships
// ============================================================================
describe('Post Model & Relations', () => {
  it('should create a post linked to user and group', async () => {
    const user = await createTestUser('postuser');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    expect(post.userId).toBe(user.id);
    expect(post.groupId).toBe(group.id);
    expect(post.deleted).toBe(false);
    expect(post.upvotes).toBe(0);
  });

  it('should query user → posts relation', async () => {
    const user = await createTestUser('postrel');
    const group = await createTestGroup(user.id);
    await createTestPost(user.id, group.id);
    await createTestPost(user.id, group.id);

    const userWithPosts = await prisma.user.findUnique({
      where: { id: user.id },
      include: { posts: true },
    });
    expect(userWithPosts!.posts.length).toBe(2);
  });

  it('should query post → user relation', async () => {
    const user = await createTestUser('postback');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const postWithUser = await prisma.post.findUnique({
      where: { id: post.id },
      include: { user: true },
    });
    expect(postWithUser!.user.id).toBe(user.id);
  });
});

// ============================================================================
// 3. Comment → Post, User
// ============================================================================
describe('Comment Model & Relations', () => {
  it('should create a comment on a post', async () => {
    const user = await createTestUser('commentuser');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const comment = await prisma.comment.create({
      data: {
        userId: user.id,
        postId: post.id,
        content: 'Test comment',
        startWordIndex: 0,
        endWordIndex: 3,
      },
    });
    track('comment', comment.id);

    expect(comment.content).toBe('Test comment');
    expect(comment.deleted).toBe(false);
  });

  it('should query post → comments relation', async () => {
    const user = await createTestUser('commentrel');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const c1 = await prisma.comment.create({
      data: { userId: user.id, postId: post.id, content: 'Comment 1' },
    });
    const c2 = await prisma.comment.create({
      data: { userId: user.id, postId: post.id, content: 'Comment 2' },
    });
    track('comment', c1.id);
    track('comment', c2.id);

    const postWithComments = await prisma.post.findUnique({
      where: { id: post.id },
      include: { comments: true },
    });
    expect(postWithComments!.comments.length).toBe(2);
  });
});

// ============================================================================
// 4. Quote → Post, User
// ============================================================================
describe('Quote Model & Relations', () => {
  it('should create a quote linked to post and user', async () => {
    const user = await createTestUser('quoteuser');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const quote = await prisma.quote.create({
      data: {
        userId: user.id,
        postId: post.id,
        quote: 'This is a test quote',
        startWordIndex: 0,
        endWordIndex: 5,
      },
    });
    track('quote', quote.id);

    expect(quote.quote).toBe('This is a test quote');
  });

  it('should query post → quotes relation', async () => {
    const user = await createTestUser('quoterel');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const q = await prisma.quote.create({
      data: { userId: user.id, postId: post.id, quote: 'Quote 1' },
    });
    track('quote', q.id);

    const postWithQuotes = await prisma.post.findUnique({
      where: { id: post.id },
      include: { quotes: true },
    });
    expect(postWithQuotes!.quotes.length).toBe(1);
    expect(postWithQuotes!.quotes[0].quote).toBe('Quote 1');
  });
});

// ============================================================================
// 5. Vote → Post, User
// ============================================================================
describe('Vote Model & Relations', () => {
  it('should create an upvote and a downvote', async () => {
    const user = await createTestUser('voteuser');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const upvote = await prisma.vote.create({
      data: { userId: user.id, postId: post.id, type: 'up' },
    });
    const downvote = await prisma.vote.create({
      data: { userId: user.id, postId: post.id, type: 'down' },
    });
    track('vote', upvote.id);
    track('vote', downvote.id);

    expect(upvote.type).toBe('up');
    expect(downvote.type).toBe('down');
    expect(upvote.deleted).toBe(false);
  });

  it('should query post → votes relation', async () => {
    const user = await createTestUser('voterel');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const v = await prisma.vote.create({
      data: { userId: user.id, postId: post.id, type: 'up', tags: ['insightful'] },
    });
    track('vote', v.id);

    const postWithVotes = await prisma.post.findUnique({
      where: { id: post.id },
      include: { votes: true },
    });
    expect(postWithVotes!.votes.length).toBe(1);
    expect(postWithVotes!.votes[0].tags).toContain('insightful');
  });
});

// ============================================================================
// 6. MessageRoom + Message → User relationships
// ============================================================================
describe('MessageRoom & Message Relations', () => {
  it('should create a message room and messages', async () => {
    const user = await createTestUser('msguser');

    const room = await prisma.messageRoom.create({
      data: {
        userIds: [user.id],
        messageType: 'USER',
        isDirect: true,
      },
    });
    track('messageRoom', room.id);

    const msg = await prisma.message.create({
      data: {
        messageRoomId: room.id,
        userId: user.id,
        text: 'Hello world',
      },
    });
    track('message', msg.id);

    expect(msg.text).toBe('Hello world');
    expect(msg.deleted).toBe(false);
  });

  it('should query room → messages relation', async () => {
    const user = await createTestUser('msgrel');

    const room = await prisma.messageRoom.create({
      data: { userIds: [user.id], messageType: 'USER' },
    });
    track('messageRoom', room.id);

    const m1 = await prisma.message.create({
      data: { messageRoomId: room.id, userId: user.id, text: 'Msg 1' },
    });
    const m2 = await prisma.message.create({
      data: { messageRoomId: room.id, userId: user.id, text: 'Msg 2' },
    });
    track('message', m1.id);
    track('message', m2.id);

    const roomWithMessages = await prisma.messageRoom.findUnique({
      where: { id: room.id },
      include: { messages: true },
    });
    expect(roomWithMessages!.messages.length).toBe(2);
  });
});

// ============================================================================
// 7. Reaction → Message, User
// ============================================================================
describe('Reaction Model & Relations', () => {
  it('should create a reaction on a message', async () => {
    const user = await createTestUser('reactuser');
    const room = await prisma.messageRoom.create({
      data: { userIds: [user.id], messageType: 'USER' },
    });
    track('messageRoom', room.id);

    const msg = await prisma.message.create({
      data: { messageRoomId: room.id, userId: user.id, text: 'React to this' },
    });
    track('message', msg.id);

    const reaction = await prisma.reaction.create({
      data: { userId: user.id, messageId: msg.id, emoji: '👍' },
    });
    track('reaction', reaction.id);

    expect(reaction.emoji).toBe('👍');
  });

  it('should query message → reactions relation', async () => {
    const user = await createTestUser('reactrel');
    const room = await prisma.messageRoom.create({
      data: { userIds: [user.id], messageType: 'USER' },
    });
    track('messageRoom', room.id);

    const msg = await prisma.message.create({
      data: { messageRoomId: room.id, userId: user.id, text: 'Reactions test' },
    });
    track('message', msg.id);

    const r = await prisma.reaction.create({
      data: { userId: user.id, messageId: msg.id, emoji: '❤️' },
    });
    track('reaction', r.id);

    const msgWithReactions = await prisma.message.findUnique({
      where: { id: msg.id },
      include: { reactions: true },
    });
    expect(msgWithReactions!.reactions.length).toBe(1);
  });
});

// ============================================================================
// 8. Presence → User
// ============================================================================
describe('Presence Model & Relations', () => {
  it('should create presence for a user', async () => {
    const user = await createTestUser('presuser');

    const presence = await prisma.presence.create({
      data: { userId: user.id, status: 'online' },
    });
    track('presence', presence.id);

    expect(presence.status).toBe('online');
    expect(presence.userId).toBe(user.id);
  });

  it('should query user → presence relation', async () => {
    const user = await createTestUser('presrel');

    const p = await prisma.presence.create({
      data: { userId: user.id, status: 'away', statusMessage: 'BRB' },
    });
    track('presence', p.id);

    const userWithPresence = await prisma.user.findUnique({
      where: { id: user.id },
      include: { presence: true },
    });
    expect(userWithPresence!.presence).not.toBeNull();
    expect(userWithPresence!.presence!.status).toBe('away');
    expect(userWithPresence!.presence!.statusMessage).toBe('BRB');
  });
});

// ============================================================================
// 9. Roster → User (bidirectional buddy)
// ============================================================================
describe('Roster Model & Relations', () => {
  it('should create a roster entry between two users', async () => {
    const user1 = await createTestUser('roster1');
    const user2 = await createTestUser('roster2');

    const roster = await prisma.roster.create({
      data: {
        userId: user1.id,
        buddyId: user2.id,
        status: 'pending',
        initiatedBy: user1.id,
      },
    });
    track('roster', roster.id);

    expect(roster.status).toBe('pending');
  });

  it('should enforce unique userId+buddyId constraint', async () => {
    const user1 = await createTestUser('rosteruniq1');
    const user2 = await createTestUser('rosteruniq2');

    const r = await prisma.roster.create({
      data: { userId: user1.id, buddyId: user2.id, status: 'accepted' },
    });
    track('roster', r.id);

    await expect(
      prisma.roster.create({
        data: { userId: user1.id, buddyId: user2.id, status: 'pending' },
      })
    ).rejects.toThrow();
  });

  it('should query user → rosters relation', async () => {
    const user1 = await createTestUser('rosterrel1');
    const user2 = await createTestUser('rosterrel2');

    const r = await prisma.roster.create({
      data: { userId: user1.id, buddyId: user2.id, status: 'accepted' },
    });
    track('roster', r.id);

    const userWithRosters = await prisma.user.findUnique({
      where: { id: user1.id },
      include: { rosters: true, buddyRosters: true },
    });
    expect(userWithRosters!.rosters.length).toBe(1);
  });
});

// ============================================================================
// 10. Typing → MessageRoom, User
// ============================================================================
describe('Typing Model & Relations', () => {
  it('should create a typing indicator', async () => {
    const user = await createTestUser('typeuser');
    const room = await prisma.messageRoom.create({
      data: { userIds: [user.id], messageType: 'USER' },
    });
    track('messageRoom', room.id);

    const typing = await prisma.typing.create({
      data: { messageRoomId: room.id, userId: user.id, isTyping: true },
    });
    track('typing', typing.id);

    expect(typing.isTyping).toBe(true);
  });

  it('should enforce unique messageRoomId+userId constraint', async () => {
    const user = await createTestUser('typeuniq');
    const room = await prisma.messageRoom.create({
      data: { userIds: [user.id], messageType: 'USER' },
    });
    track('messageRoom', room.id);

    const t = await prisma.typing.create({
      data: { messageRoomId: room.id, userId: user.id },
    });
    track('typing', t.id);

    await expect(
      prisma.typing.create({
        data: { messageRoomId: room.id, userId: user.id },
      })
    ).rejects.toThrow();
  });

  it('should query room → typingIndicators relation', async () => {
    const user = await createTestUser('typerel');
    const room = await prisma.messageRoom.create({
      data: { userIds: [user.id], messageType: 'USER' },
    });
    track('messageRoom', room.id);

    const t = await prisma.typing.create({
      data: { messageRoomId: room.id, userId: user.id },
    });
    track('typing', t.id);

    const roomWithTyping = await prisma.messageRoom.findUnique({
      where: { id: room.id },
      include: { typingIndicators: true },
    });
    expect(roomWithTyping!.typingIndicators.length).toBe(1);
  });
});

// ============================================================================
// 11. UserReport → User (reporter + reported)
// ============================================================================
describe('UserReport Model & Relations', () => {
  it('should create a user report', async () => {
    const reporter = await createTestUser('reporter');
    const reported = await createTestUser('reported');

    const report = await prisma.userReport.create({
      data: {
        reporterId: reporter.id,
        reportedUserId: reported.id,
        reason: 'spam',
        description: 'Test report',
      },
    });
    track('userReport', report.id);

    expect(report.reason).toBe('spam');
    expect(report.status).toBe('pending');
    expect(report.severity).toBe('medium');
  });

  it('should query user → reports relations', async () => {
    const reporter = await createTestUser('reprel1');
    const reported = await createTestUser('reprel2');

    const r = await prisma.userReport.create({
      data: { reporterId: reporter.id, reportedUserId: reported.id, reason: 'harassment' },
    });
    track('userReport', r.id);

    const reporterWithReports = await prisma.user.findUnique({
      where: { id: reporter.id },
      include: { userReportsMade: true },
    });
    expect(reporterWithReports!.userReportsMade.length).toBe(1);

    const reportedWithReports = await prisma.user.findUnique({
      where: { id: reported.id },
      include: { userReportsReceived: true },
    });
    expect(reportedWithReports!.userReportsReceived.length).toBe(1);
  });
});

// ============================================================================
// 12. Deep Nested Relations: User → Post → Comments + Votes + Quotes
// ============================================================================
describe('Deep Nested Relationship Traversal', () => {
  it('should traverse user → posts → comments + votes + quotes', async () => {
    const user = await createTestUser('deeprel');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const comment = await prisma.comment.create({
      data: { userId: user.id, postId: post.id, content: 'Deep comment' },
    });
    const vote = await prisma.vote.create({
      data: { userId: user.id, postId: post.id, type: 'up' },
    });
    const quote = await prisma.quote.create({
      data: { userId: user.id, postId: post.id, quote: 'Deep quote' },
    });
    track('comment', comment.id);
    track('vote', vote.id);
    track('quote', quote.id);

    const userDeep = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        posts: {
          include: {
            comments: true,
            votes: true,
            quotes: true,
          },
        },
      },
    });

    expect(userDeep!.posts.length).toBe(1);
    expect(userDeep!.posts[0].comments.length).toBe(1);
    expect(userDeep!.posts[0].votes.length).toBe(1);
    expect(userDeep!.posts[0].quotes.length).toBe(1);
    expect(userDeep!.posts[0].comments[0].content).toBe('Deep comment');
    expect(userDeep!.posts[0].votes[0].type).toBe('up');
    expect(userDeep!.posts[0].quotes[0].quote).toBe('Deep quote');
  });

  it('should traverse room → messages → reactions', async () => {
    const user = await createTestUser('deepmsg');
    const room = await prisma.messageRoom.create({
      data: { userIds: [user.id], messageType: 'USER' },
    });
    track('messageRoom', room.id);

    const msg = await prisma.message.create({
      data: { messageRoomId: room.id, userId: user.id, text: 'Deep message' },
    });
    track('message', msg.id);

    const reaction = await prisma.reaction.create({
      data: { userId: user.id, messageId: msg.id, emoji: '🔥' },
    });
    track('reaction', reaction.id);

    const roomDeep = await prisma.messageRoom.findUnique({
      where: { id: room.id },
      include: {
        messages: {
          include: { reactions: true },
        },
      },
    });

    expect(roomDeep!.messages.length).toBe(1);
    expect(roomDeep!.messages[0].reactions.length).toBe(1);
    expect(roomDeep!.messages[0].reactions[0].emoji).toBe('🔥');
  });
});

// ============================================================================
// 13. Activity → User, Post, Vote, Comment, Quote
// ============================================================================
describe('Activity Model & Relations', () => {
  it('should create an activity linked to user and post', async () => {
    const user = await createTestUser('actuser');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const activity = await prisma.activity.create({
      data: {
        userId: user.id,
        postId: post.id,
        activityType: 'POSTED',
        content: 'Created a post',
      },
    });
    track('activity', activity.id);

    expect(activity.activityType).toBe('POSTED');
  });

  it('should query user → activities relation', async () => {
    const user = await createTestUser('actrel');
    const group = await createTestGroup(user.id);
    const post = await createTestPost(user.id, group.id);

    const a = await prisma.activity.create({
      data: { userId: user.id, postId: post.id, activityType: 'VOTED' },
    });
    track('activity', a.id);

    const userWithActivities = await prisma.user.findUnique({
      where: { id: user.id },
      include: { activities: true },
    });
    expect(userWithActivities!.activities.length).toBe(1);
  });
});
