"use client";

import { MessageSquareWarningIcon } from "lucide-react";
import { cn } from "../lib/utils";

export function NewsBanner() {
  return (
    <div className="w-full overflow-hidden bg-gradient-to-b from-red-500 to-red-600 py-2">
      <div className="animate-marquee whitespace-nowrap">
        <span className="mx-4 flex w-[300vw] items-center gap-4 text-lg font-semibold text-white">
          Server-based deployments are disabled due to limited budget{" "}
          <MessageSquareWarningIcon className="h-6 w-6" />
          Server-based deployments are disabled due to limited budget{" "}
          <MessageSquareWarningIcon className="h-6 w-6" />
          Server-based deployments are disabled due to limited budget{" "}
          <MessageSquareWarningIcon className="h-6 w-6" />
          Server-based deployments are disabled due to limited budget{" "}
          <MessageSquareWarningIcon className="h-6 w-6" />
        </span>
      </div>
    </div>
  );
}
