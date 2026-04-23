import Group from '~/data/models/Group';
import type { ResolverFn } from '~/types/graphql';
import type * as Common from '~/types/common';

export const getGroups: ResolverFn<Common.Group[], unknown, { limit?: number }> = async (
  _,
  args
) => {
  const query = Group.find({});
  if (args.limit && args.limit > 0) {
    query.limit(args.limit);
  }
  const groups = await query.exec();
  return groups as unknown as Common.Group[];
};
