"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

type TrackedCtaLinkProps = ComponentProps<typeof Link> & {
  analyticsLocation: string;
  analyticsLabel: string;
};

export function TrackedCtaLink({
  analyticsLocation,
  analyticsLabel,
  href,
  onClick,
  ...props
}: TrackedCtaLinkProps) {
  const { trackCtaClick } = useAnalytics();

  return (
    <Link
      href={href}
      onClick={(event) => {
        trackCtaClick(analyticsLocation, analyticsLabel, String(href));
        onClick?.(event);
      }}
      {...props}
    />
  );
}

