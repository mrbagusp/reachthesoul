"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import LeadScraper from "@/components/LeadScraper";

export default function ScraperPage() {
  const { userData } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (userData && !userData.isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [userData, router]);

  if (!userData?.isPlatformAdmin) return null;

  return <LeadScraper />;
}