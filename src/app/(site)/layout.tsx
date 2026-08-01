import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { homeFor } from "@/lib/auth-routes";
import { getSession } from "@/lib/server/auth";

// Reading the session cookie opts these pages out of static rendering. Phase 2
// makes them database-driven anyway.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  return (
    <>
      <SiteNav
        account={
          user
            ? {
                name: user.name,
                email: user.email,
                href: homeFor(user.role),
                isOwner: user.isOwner,
              }
            : null
        }
      />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
