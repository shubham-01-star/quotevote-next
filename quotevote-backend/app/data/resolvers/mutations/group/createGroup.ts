import { logger } from '~/data/utils/logger';
import Group from '~/data/models/Group';
import type { ResolverFn } from '~/types/graphql';
import type * as Common from '~/types/common';

export const createGroup: ResolverFn<Common.Group, unknown, { group: Common.GroupInput }> = async (
  _,
  args
) => {
  logger.info('Function: createGroup');
  try {
    const isExist = await Group.findOne({ title: args.group.title });
    if (isExist) throw new Error('Group name already exists!');

    const newGroup = await new Group({
      ...args.group,
      allowedUserIds: [args.group.creatorId],
      adminIds: [args.group.creatorId],
      created: new Date(),
    }).save();

    const url = `/${newGroup.title.replace(/ /g, '-').toLowerCase()}`;
    await Group.findByIdAndUpdate(newGroup._id, { url });
    newGroup.url = url;

    return newGroup as unknown as Common.Group;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : String(err));
  }
};
