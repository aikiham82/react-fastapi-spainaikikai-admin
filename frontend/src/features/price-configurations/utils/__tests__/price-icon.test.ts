import { describe, it, expect } from 'vitest'
import { BadgeCheck, Building2, HeartPulse, IdCard, ShieldCheck, Tag } from 'lucide-react'
import { priceIconOf } from '../price-icon'

describe('priceIconOf', () => {
  it.each([
    ['club_fee', 'club_fee', Building2],
    ['dan-none-adulto', 'license', IdCard],
    ['kyu-none-infantil', 'license', IdCard],
    ['seguro_accidentes', 'insurance', HeartPulse],
    ['seguro_rc', 'insurance', ShieldCheck],
    ['oficialidad_seminar', 'seminar', BadgeCheck],
    ['something_else', 'other', Tag],
  ] as const)('maps %s to its concept icon', (key, category, icon) => {
    expect(priceIconOf(key, category)).toBe(icon)
  })
})
