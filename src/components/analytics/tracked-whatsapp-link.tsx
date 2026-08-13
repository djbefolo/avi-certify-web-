"use client";

import type { ComponentProps } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

type TrackedWhatsAppLinkProps = ComponentProps<"a"> & {
  analyticsLocation: string;
};

const whatsappHref = "https://wa.me/message/XOKRBYI3ZEQBM1";

export function TrackedWhatsAppLink({
  analyticsLocation,
  children,
  onClick,
  ...props
}: TrackedWhatsAppLinkProps) {
  const { trackCtaClick } = useAnalytics();

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        trackCtaClick(analyticsLocation, "WhatsApp", whatsappHref);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
