import { useDashboardDataQuery } from './queries/useDashboardData.query'

export type NavCounters = Partial<Record<string, number>>

export const useNavCounters = (): NavCounters => {
  const { data } = useDashboardDataQuery()
  if (!data) return {}
  const { expired_licenses, clubs_pending } = data.stats
  return {
    ...(expired_licenses > 0 ? { '/licenses': expired_licenses } : {}),
    ...(clubs_pending > 0 ? { '/payments': clubs_pending } : {}),
  }
}
