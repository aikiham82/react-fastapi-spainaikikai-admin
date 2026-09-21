import { describe, it, expect } from 'vitest';
import { filterMembersWithAccess } from '../member-access';

const members = [
  { id: 'member-1', first_name: 'Kuki Aikikai', last_name: '(Club Admin)' },
  { id: 'member-2', first_name: 'Juan Carlos', last_name: 'Arevalo' },
];

describe('filterMembersWithAccess', () => {
  it('keeps every member when the filter is off', () => {
    const result = filterMembersWithAccess(members, new Set(['member-1']), false);

    expect(result).toHaveLength(2);
  });

  it('keeps only the members holding an account when the filter is on', () => {
    const result = filterMembersWithAccess(members, new Set(['member-1']), true);

    expect(result.map((member) => member.id)).toEqual(['member-1']);
  });

  it('keeps nobody when no member holds an account', () => {
    const result = filterMembersWithAccess(members, new Set(), true);

    expect(result).toHaveLength(0);
  });
});
