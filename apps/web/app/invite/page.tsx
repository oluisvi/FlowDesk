import type { Metadata } from "next";
import { InvitationAcceptPage } from "@/features/invitations/invitation-accept-page";

export const metadata: Metadata = {
  title: "Aceitar convite",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <InvitationAcceptPage />;
}
