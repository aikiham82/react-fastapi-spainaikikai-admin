import { useQuery } from "@tanstack/react-query";
import { getMemberLicenses, getLicenseImageBase64 } from "../../license.service";
import type { LicenseResponse } from "../../license.schema";

export function useMemberLicenseQuery(memberId: string | null | undefined) {
  return useQuery<LicenseResponse | null>({
    queryKey: ["license", "member", memberId],
    queryFn: async () => {
      if (!memberId) return null;
      const licenses = await getMemberLicenses(memberId);

      // Find active license, or most recent by expiry_date
      const active = licenses.find((l) => l.status === "active");
      if (active) return active;

      const sorted = [...licenses].sort((a, b) => {
        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : 0;
        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : 0;
        return dateB - dateA;
      });

      return sorted[0] ?? null;
    },
    enabled: !!memberId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useLicenseImageQuery(licenseId: string | null | undefined) {
  return useQuery<string>({
    queryKey: ["license", "image", licenseId],
    queryFn: () => getLicenseImageBase64(licenseId!),
    enabled: !!licenseId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
