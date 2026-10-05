"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { TourProvider } from "@/components/workspace/tour";
import { ReviewProvider } from "@/lib/review-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ReviewProvider>
        <TourProvider>
          {children}
          <Toaster position="top-center" />
        </TourProvider>
      </ReviewProvider>
    </TooltipProvider>
  );
}
