import { describe, it, expect } from 'vitest';
import type { License } from '../../data/schemas/license.schema';
import { cardTitle, pickCardLicence } from '../cardLicence';

const NOW = new Date('2026-11-02T10:00:00');

const licence = (overrides: Partial<License>): License => ({
  id: 'lic',
  license_number: 'LIC-1',
  member_id: 'member-1',
  grade: '3º Dan',
  issue_date: '2026-01-01T00:00:00',
  expiry_date: '2026-12-31T23:59:59',
  status: 'active',
  dan_grade: 3,
  technical_grade: 'dan',
  instructor_category: 'none',
  age_category: 'adulto',
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
  ...overrides,
});

describe('pickCardLicence', () => {
  it('has nothing to show without licences', () => {
    expect(pickCardLicence([], NOW)).toBeNull();
  });

  it('prefers the latest expiry', () => {
    const old = licence({ id: 'old', expiry_date: '2024-12-31T23:59:59' });
    const latest = licence({ id: 'latest', expiry_date: '2025-12-31T23:59:59' });

    expect(pickCardLicence([old, latest], NOW)?.id).toBe('latest');
  });

  it('prefers the licence holding the grade over one holding only a title', () => {
    const title = licence({ id: 'title', grade: 'Shidoin', dan_grade: 0, instructor_category: 'shidoin' });
    const grade = licence({ id: 'grade', grade: '5º Dan', dan_grade: 5 });

    expect(pickCardLicence([title, grade], NOW)?.id).toBe('grade');
  });

  it('prefers a title in force over a grade that expired', () => {
    const title = licence({ id: 'title', grade: 'Shidoin', dan_grade: 0, instructor_category: 'shidoin' });
    const grade = licence({ id: 'grade', grade: '5º Dan', dan_grade: 5, expiry_date: '2025-12-31T23:59:59' });

    expect(pickCardLicence([grade, title], NOW)?.id).toBe('title');
  });

  it('leaves a revoked licence last', () => {
    const revoked = licence({ id: 'revoked', status: 'revoked' });
    const expired = licence({ id: 'expired', expiry_date: '2025-12-31T23:59:59' });

    expect(pickCardLicence([revoked, expired], NOW)?.id).toBe('expired');
  });
});

describe('cardTitle', () => {
  it('takes the highest title on any licence', () => {
    const licences = [licence({ instructor_category: 'fukushidoin' }), licence({ instructor_category: 'shidoin' })];

    expect(cardTitle(licences)).toBe('shidoin');
  });

  it('ignores a revoked licence', () => {
    expect(cardTitle([licence({ status: 'revoked', instructor_category: 'shidoin' })])).toBe('none');
  });
});
