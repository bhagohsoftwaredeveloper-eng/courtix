import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AvatarCard } from "@/app/account/profile/AvatarCard";
import { ProfileForm } from "@/app/account/profile/ProfileForm";
import { DashHeader } from "@/components/dashboard/parts";
import { SPORTS } from "@/lib/data/sports";
import { listLiveCities } from "@/lib/server/catalog";
import { getProfileForm } from "@/lib/server/player";

export const metadata: Metadata = { title: "Edit profile" };

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const [values, cities] = await Promise.all([getProfileForm(), listLiveCities()]);
  if (!values) redirect("/login?next=/account/profile");

  return (
    <>
      <DashHeader title="Edit profile" sub="How you appear to hosts and other players" />
      <div className="grid items-start gap-[18px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <AvatarCard name={values.name} src={values.avatarSrc} />
        <ProfileForm
          values={values}
          cities={cities}
          sports={SPORTS.map((s) => ({ slug: s.slug, name: s.name }))}
        />
      </div>
    </>
  );
}
