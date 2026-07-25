"use server";

import { revalidatePath } from "next/cache";

import { ProfileInput } from "@/app/account/profile/schema";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export interface ProfileState {
  errors?: Record<string, string>;
  saved?: boolean;
}

export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = ProfileInput.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    homeCityId: formData.get("homeCityId") ?? "",
    skill: formData.get("skill"),
    rating: formData.get("rating") ?? "",
    sportIds: formData.getAll("sportIds").map(String),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { errors };
  }

  const { name, phone, homeCityId, skill, rating, sportIds } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { name, phone: phone === "" ? null : phone },
    });

    // An account created outside the seed may have no profile row yet, so this
    // creates one rather than failing the save.
    const profile = await tx.playerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        skill,
        rating: rating === "" ? null : rating,
        homeCityId: homeCityId === "" ? null : homeCityId,
      },
      update: {
        skill,
        rating: rating === "" ? null : rating,
        homeCityId: homeCityId === "" ? null : homeCityId,
      },
      select: { id: true },
    });

    // Favourite sports are a set: clear and rewrite, scoped to this profile.
    await tx.playerSport.deleteMany({ where: { playerProfileId: profile.id } });
    if (sportIds.length > 0) {
      await tx.playerSport.createMany({
        data: sportIds.map((sportId) => ({ playerProfileId: profile.id, sportId })),
      });
    }
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { saved: true };
}
