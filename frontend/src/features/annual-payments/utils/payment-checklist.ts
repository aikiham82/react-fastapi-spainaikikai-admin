import { formatGradeEs } from '@/core/utils/grade';
import type { Member } from '@/features/members/data/schemas/member.schema';
import type {
  AnnualPaymentItemType,
  AnnualPaymentPrices,
  MemberPaymentAssignment,
} from '../data/schemas/annual-payment.schema';

export type LicenceItem = 'kyu' | 'kyu_infantil' | 'dan' | 'fukushidoin' | 'shidoin';
type InsuranceItem = 'seguro_accidentes' | 'seguro_rc';
export type MemberItem = LicenceItem | InsuranceItem;

const LICENCE_ITEMS: readonly LicenceItem[] = ['kyu', 'kyu_infantil', 'dan', 'fukushidoin', 'shidoin'];
const INSTRUCTOR_ITEMS: readonly LicenceItem[] = ['fukushidoin', 'shidoin'];
export const CHOOSABLE_LICENCE_ITEMS: readonly LicenceItem[] = ['kyu', 'kyu_infantil', 'dan'];
const MEMBER_ITEMS: readonly MemberItem[] = [...LICENCE_ITEMS, 'seguro_accidentes', 'seguro_rc'];
const CHILD_MAX_AGE = 14;

export const PRICE_CONCEPT_LABELS: Record<AnnualPaymentItemType, string> = {
  club_fee: 'Cuota anual del club',
  kyu: 'Licencia Kyu',
  kyu_infantil: 'Licencia Kyu infantil',
  dan: 'Licencia Dan',
  fukushidoin: 'Licencia Fukushidoin',
  shidoin: 'Licencia Shidoin',
  seguro_accidentes: 'Seguro de accidentes',
  seguro_rc: 'Seguro de responsabilidad civil',
};

export const LICENCE_LABELS: Record<LicenceItem, string> = {
  kyu: PRICE_CONCEPT_LABELS.kyu,
  kyu_infantil: PRICE_CONCEPT_LABELS.kyu_infantil,
  dan: PRICE_CONCEPT_LABELS.dan,
  fukushidoin: PRICE_CONCEPT_LABELS.fukushidoin,
  shidoin: PRICE_CONCEPT_LABELS.shidoin,
};

export const INSURANCE_LABELS: Record<InsuranceItem, string> = {
  seguro_accidentes: PRICE_CONCEPT_LABELS.seguro_accidentes,
  seguro_rc: 'Seguro RC',
};

export interface ChecklistRow {
  memberId: string;
  memberName: string;
  grade: string;
  licence: LicenceItem;
  licenceChoosable: boolean;
  offersRc: boolean;
  licencePaid: boolean;
  accidentPaid: boolean;
  rcPaid: boolean;
  isUpToDate: boolean;
}

const isInstructor = (item: LicenceItem) => INSTRUCTOR_ITEMS.includes(item);

const ageOn = (birthDate: string | undefined, today: Date): number | null => {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  let age = today.getFullYear() - born.getFullYear();
  const beforeBirthday =
    today.getMonth() < born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
};

const licenceItemOf = (member: Member, today: Date = new Date()): LicenceItem => {
  const summary = member.license_summary;
  const instructor = summary?.instructor_category;
  if (instructor === 'fukushidoin' || instructor === 'shidoin') return instructor;
  if (summary?.technical_grade === 'dan') return 'dan';
  if (summary?.technical_grade === 'kyu') {
    return summary.grade?.toLowerCase().includes('infantil') ? 'kyu_infantil' : 'kyu';
  }
  const age = ageOn(member.birth_date, today);
  return age !== null && age <= CHILD_MAX_AGE ? 'kyu_infantil' : 'kyu';
};

const paidTypesByMember = (paid: MemberPaymentAssignment[]): Map<string, Set<string>> =>
  new Map(paid.map((a) => [a.member_id, new Set(a.payment_types)]));

const fullName = (member: Member) => `${member.first_name} ${member.last_name}`.trim();

const byName = (a: ChecklistRow, b: ChecklistRow) => a.memberName.localeCompare(b.memberName, 'es');

export const buildChecklistRows = (
  members: Member[],
  paidAssignments: MemberPaymentAssignment[] = [],
  today: Date = new Date(),
): ChecklistRow[] => {
  const paid = paidTypesByMember(paidAssignments);
  const rows = members.map((member): ChecklistRow => {
    const licence = licenceItemOf(member, today);
    const paidTypes = paid.get(member.id) ?? new Set<string>();
    const offersRc = !isInstructor(licence);
    const licencePaid = LICENCE_ITEMS.some((item) => paidTypes.has(item));
    const accidentPaid = paidTypes.has('seguro_accidentes');
    const rcPaid = !offersRc || paidTypes.has('seguro_rc');
    return {
      memberId: member.id,
      memberName: fullName(member),
      grade: member.license_summary?.grade ? formatGradeEs(member.license_summary.grade) : 'Sin licencia',
      licence,
      licenceChoosable: !member.license_summary,
      offersRc,
      licencePaid,
      accidentPaid,
      rcPaid,
      isUpToDate: licencePaid && accidentPaid && rcPaid,
    };
  });
  return [
    ...rows.filter((row) => !row.isUpToDate).sort(byName),
    ...rows.filter((row) => row.isUpToDate).sort(byName),
  ];
};

export const pendingInsuranceOf = (row: ChecklistRow): InsuranceItem[] => [
  ...(row.accidentPaid ? [] : (['seguro_accidentes'] as const)),
  ...(row.offersRc && !row.rcPaid ? (['seguro_rc'] as const) : []),
];

const pendingItemsOf = (row: ChecklistRow): MemberItem[] => [
  ...(row.licencePaid ? [] : [row.licence]),
  ...pendingInsuranceOf(row),
];

export const tickedLicenceOf = (ticked: Set<string>, row: ChecklistRow): LicenceItem =>
  row.licenceChoosable
    ? CHOOSABLE_LICENCE_ITEMS.find((item) => ticked.has(item)) ?? row.licence
    : row.licence;

export const sanitizeAssignments = (
  assignments: MemberPaymentAssignment[],
  rows: ChecklistRow[],
): MemberPaymentAssignment[] => {
  const byMember = new Map(rows.map((row) => [row.memberId, row]));
  return assignments.flatMap((assignment) => {
    const row = byMember.get(assignment.member_id);
    if (!row) return [];
    const ticked = new Set(assignment.payment_types);
    const licence = tickedLicenceOf(ticked, row);
    const types: MemberItem[] = [
      ...(!row.licencePaid && ticked.has(licence) ? [licence] : []),
      ...pendingInsuranceOf(row).filter((item) => ticked.has(item)),
    ];
    return types.length > 0 ? [{ ...assignment, payment_types: types }] : [];
  });
};

export const tickedItemsOf = (assignments: MemberPaymentAssignment[], memberId: string): Set<string> =>
  new Set(assignments.find((a) => a.member_id === memberId)?.payment_types ?? []);

export const toggleItems = (
  assignments: MemberPaymentAssignment[],
  row: ChecklistRow,
  items: MemberItem[],
): MemberPaymentAssignment[] => {
  const next = tickedItemsOf(assignments, row.memberId);
  const allTicked = items.every((item) => next.has(item));
  items.forEach((item) => (allTicked ? next.delete(item) : next.add(item)));
  const others = assignments.filter((a) => a.member_id !== row.memberId);
  if (next.size === 0) return others;
  return [...others, { member_id: row.memberId, member_name: row.memberName, payment_types: [...next] }];
};

export const chooseLicence = (
  assignments: MemberPaymentAssignment[],
  row: ChecklistRow,
  licence: LicenceItem,
): MemberPaymentAssignment[] => {
  const ticked = tickedItemsOf(assignments, row.memberId);
  const insurance = [...ticked].filter((item) => !LICENCE_ITEMS.includes(item as LicenceItem));
  const others = assignments.filter((a) => a.member_id !== row.memberId);
  return [...others, { member_id: row.memberId, member_name: row.memberName, payment_types: [licence, ...insurance] }];
};

export const tickAllPending = (
  rows: ChecklistRow[],
  assignments: MemberPaymentAssignment[] = [],
): MemberPaymentAssignment[] =>
  rows.flatMap((row) => {
    const licence = tickedLicenceOf(tickedItemsOf(assignments, row.memberId), row);
    const items = pendingItemsOf(row).map((item) => (LICENCE_ITEMS.includes(item as LicenceItem) ? licence : item));
    return items.length > 0
      ? [{ member_id: row.memberId, member_name: row.memberName, payment_types: items }]
      : [];
  });

type ItemCounts = Record<MemberItem, number>;

export const deriveCounts = (assignments: MemberPaymentAssignment[]): ItemCounts => {
  const counts = Object.fromEntries(MEMBER_ITEMS.map((item) => [item, 0])) as ItemCounts;
  assignments.forEach((assignment) => {
    assignment.payment_types.forEach((type) => {
      if (type in counts) counts[type as MemberItem] += 1;
    });
  });
  return counts;
};

export const requiredPriceConcepts = (rows: ChecklistRow[], clubFeePaid: boolean): AnnualPaymentItemType[] => {
  const needed = new Set<AnnualPaymentItemType>();
  if (!clubFeePaid) needed.add('club_fee');
  rows.forEach((row) => pendingItemsOf(row).forEach((item) => needed.add(item)));
  return [...needed];
};

export const missingPriceConcepts = (
  prices: Partial<AnnualPaymentPrices> | null | undefined,
  required: AnnualPaymentItemType[],
): AnnualPaymentItemType[] => required.filter((concept) => prices?.[concept] == null);

export const tickedPriceConcepts = (
  assignments: MemberPaymentAssignment[],
  includeClubFee: boolean,
): AnnualPaymentItemType[] => {
  const counts = deriveCounts(assignments);
  return [
    ...(includeClubFee ? (['club_fee'] as const) : []),
    ...MEMBER_ITEMS.filter((item) => counts[item] > 0),
  ];
};
