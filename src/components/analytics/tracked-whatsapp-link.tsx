"use client";

import type { ComponentProps } from "react";
import { useAnalytics } from "@/hooks/use-analytics";

type TrackedWhatsAppLinkProps = ComponentProps<"a"> & {
  analyticsLocation: string;
};

const whatsappHref = "https://wa.me/message/XOKRBYI3ZEQBM1";

export function TrackedWhatsAppLink({
  analyticsLocation,
  onClick,
  ...props
}: TrackedWhatsAppLinkProps) {
  const { trackWhatsAppCtaClicked } = useAnalytics();

  return (
    <a
      href={whatsappHref}
      onClick={(event) => {
        trackWhatsAppCtaClicked(analyticsLocation);
        onClick?.(event);
      }}
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    />
  );
}
