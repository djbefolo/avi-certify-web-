"use client";

import type { ComponentProps } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

type TrackedWhatsAppLinkProps = ComponentProps<"a"> & {
  analyticsLocation: string;
};

const whatsappUrl = "https://wa.me/message/XOKRBYI3ZEQBM1";

export function TrackedWhatsAppLink({
  analyticsLocation,
  children,
  onClick,
  ...props
}: TrackedWhatsAppLinkProps) {
  const { trackWhatsAppCtaClicked } = useAnalytics();

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        trackWhatsAppCtaClicked(analyticsLocation);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
