"use client";
import { useQuery } from "@tanstack/react-query";
import { plansApi } from "@/lib/api/endpoints/plans";

export function useBillingPlans() {
  return useQuery({ queryKey: ["plans"], queryFn: plansApi.list });
}
