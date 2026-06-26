import { SessionProvider } from "next-auth/react";

export default function UnauthorizedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
