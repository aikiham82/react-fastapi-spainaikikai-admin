import { apiClient } from "@/core/api-client";
import { LicenseResponseSchema } from "./license.schema";
import type { LicenseResponse } from "./license.schema";
import { z } from "zod/v4";

export async function getMemberLicenses(
  memberId: string
): Promise<LicenseResponse[]> {
  const { data } = await apiClient.get(`/licenses/member/${memberId}`);
  return z.array(LicenseResponseSchema).parse(data);
}

export async function getLicenseImageBase64(
  licenseId: string
): Promise<string> {
  const { data } = await apiClient.get(`/licenses/${licenseId}/image`, {
    responseType: "arraybuffer",
  });

  const bytes = new Uint8Array(data);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:image/png;base64,${base64}`;
}
