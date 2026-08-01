"use server";

import { revalidatePath } from "next/cache";

import { ProfileInput } from "@/app/account/profile/schema";
import { SPORT_SLUGS } from "@/lib/data/sports";
import { validateAvatar } from "@/lib/image-upload";
import { requireUser } from "@/lib/server/auth";
import { listLiveCities } from "@/lib/server/catalog";
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
    duprId: formData.get("duprId") ?? "",
    gender: formData.get("gender") ?? "",
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

  const { name, phone, homeCityId, skill, rating, duprId, gender, sportIds } = parsed.data;

  // The zod schema only checks shape; these two checks need database/static-catalog
  // state a schema can't see, so they run here, before the transaction touches
  // any foreign-key-constrained column.
  const errors: Record<string, string> = {};

  if (sportIds.some((sportId) => !(SPORT_SLUGS as string[]).includes(sportId))) {
    errors.sportIds = "Pick from the listed sports";
  }

  if (homeCityId !== "") {
    const liveCities = await listLiveCities();
    if (!liveCities.some((city) => city.id === homeCityId)) {
      errors.homeCityId = "Pick a city from the list";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { name, phone: phone === "" ? null : phone },
    });

    // An account created outside the seed may have no profile row yet, so this
    // creates one rather than failing the save.
    const profileFields = {
      skill,
      rating: rating === "" ? null : rating,
      duprId: duprId === "" ? null : duprId,
      gender: gender === "" ? null : gender,
      homeCityId: homeCityId === "" ? null : homeCityId,
    };

    const profile = await tx.playerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profileFields },
      update: profileFields,
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

export interface AvatarState {
  error?: string;
  saved?: boolean;
}

/**
 * Store an uploaded profile photo.
 *
 * The bytes go in MySQL rather than on a CDN, so there is no bucket to
 * configure and nothing to lose when Render replaces the container. They live
 * in their own table — see the `UserAvatar` model — because the session query
 * reads `User` on every request and must never carry an image with it.
 */
export async function uploadAvatarAction(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const user = await requireUser();

  const file = formData.get("avatar");
  if (!(file instanceof File)) return { error: "Choose an image to upload." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateAvatar(bytes);
  if (!check.ok) return { error: check.error };

  // mimeType comes from the sniffed bytes, never from the browser's declared
  // Content-Type — the avatar route serves this header straight back.
  const data = { data: Buffer.from(bytes), mimeType: check.mimeType };
  await db.userAvatar.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { saved: true };
}

export async function removeAvatarAction(): Promise<void> {
  const user = await requireUser();
  await db.userAvatar.deleteMany({ where: { userId: user.id } });

  revalidatePath("/account");
  revalidatePath("/account/profile");
}
