import type { Metadata } from "next";
import { ConnectPortal } from "./connect-portal";

export const metadata: Metadata = {
  title: "Conectar Instagram | AUDE Gestão",
  description: "Autorize com segurança a conexão do seu Instagram à AUDE.",
};

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <ConnectPortal token={token} />;
}
