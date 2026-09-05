import { headers } from "next/headers";
import { AuthCard } from "@/components/auth-card";

export default async function Home() {
  const tenantSlug = (await headers()).get("x-tenant-slug");

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <AuthCard tenantSlug={tenantSlug} />
    </div>
  );
}
