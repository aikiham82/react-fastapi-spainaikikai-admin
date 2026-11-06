import { z } from "zod/v4";

import { apiClient } from "@/core/api-client";
import { ExamPaymentStartSchema, ExamPriceSchema, type ExamPaymentRequest, type ExamPrice } from "./exam.schema";

export async function getExamPrices(): Promise<ExamPrice[]> {
  const { data } = await apiClient.get("/payments/exam-prices");
  return z.array(ExamPriceSchema).parse(data);
}

export async function startExamPayment(request: ExamPaymentRequest): Promise<string> {
  const { data } = await apiClient.post("/payments/exam/initiate", request);
  return ExamPaymentStartSchema.parse(data).redirect_url;
}
