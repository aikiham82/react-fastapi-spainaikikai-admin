export const filterMembersWithAccess = <T extends { id?: string }>(
  members: T[],
  memberIdsWithAccount: ReadonlySet<string>,
  onlyWithAccess: boolean
): T[] => {
  if (!onlyWithAccess) return members;

  return members.filter((member) => Boolean(member.id) && memberIdsWithAccount.has(member.id as string));
};
