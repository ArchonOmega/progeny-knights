"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { GALLERY_BUCKET, MAX_GALLERY_IMAGE_BYTES } from "@/lib/gallery";
import { supaAdmin } from "@/lib/supabase/admin";

const EXTENSIONS: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type VerifiedImage = { extension: "jpg" | "png" | "webp" };
type ActionResult = { ok: true } | { ok: false; error: string };
type UploadTicket = { ok: true; path: string; token: string } | { ok: false; error: string };

function verifyImage(bytes: Uint8Array): VerifiedImage | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: "jpg" };
  }
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { extension: "png" };
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { extension: "webp" };
  }
  return null;
}

function galleryError(message: string): never {
  redirect("/gallery?e=" + encodeURIComponent(message));
}

export async function createGalleryUpload(input: {
  fileSize: number;
  contentType: string;
}): Promise<UploadTicket> {
  const s = await requireSession();
  if (!s.caps.has("gallery.upload")) return { ok: false, error: "You do not have permission to upload gallery images." };
  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0 || input.fileSize > MAX_GALLERY_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  const extension = EXTENSIONS[input.contentType];
  if (!extension) return { ok: false, error: "Only JPEG, PNG, and WebP images are accepted." };

  const path = `${s.userId}/${Date.now()}-${randomUUID()}.${extension}`;
  const { data, error } = await supaAdmin().storage
    .from(GALLERY_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.token) return { ok: false, error: `The upload could not be prepared: ${error?.message ?? "unknown error"}` };
  return { ok: true, path, token: data.token };
}

export async function discardGalleryUpload(storagePath: string) {
  const s = await requireSession();
  if (!s.caps.has("gallery.upload")) return;
  if (!storagePath.startsWith(`${s.userId}/`) || storagePath.includes("..")) return;
  await supaAdmin().storage.from(GALLERY_BUCKET).remove([storagePath]);
}

export async function finalizeGalleryUpload(input: {
  storagePath: string;
  title: string;
  caption: string;
}): Promise<ActionResult> {
  const s = await requireSession();
  if (!s.caps.has("gallery.upload")) return { ok: false, error: "You do not have permission to upload gallery images." };

  const expectedPrefix = `${s.userId}/`;
  if (!input.storagePath.startsWith(expectedPrefix) || input.storagePath.includes("..")) {
    return { ok: false, error: "The upload ticket is invalid." };
  }

  const admin = supaAdmin();
  const { data: storedFile, error: downloadError } = await admin.storage.from(GALLERY_BUCKET).download(input.storagePath);
  if (downloadError || !storedFile) return { ok: false, error: `The uploaded image could not be verified: ${downloadError?.message ?? "unknown error"}` };

  if (storedFile.size > MAX_GALLERY_IMAGE_BYTES) {
    await admin.storage.from(GALLERY_BUCKET).remove([input.storagePath]);
    return { ok: false, error: "The uploaded image exceeds the 10 MB limit." };
  }

  const verified = verifyImage(new Uint8Array(await storedFile.arrayBuffer()));
  const pathExtension = input.storagePath.split(".").at(-1);
  if (!verified || verified.extension !== pathExtension) {
    await admin.storage.from(GALLERY_BUCKET).remove([input.storagePath]);
    return { ok: false, error: "The uploaded file is not a valid JPEG, PNG, or WebP image." };
  }

  const title = input.title.trim().slice(0, 120);
  const caption = input.caption.trim().slice(0, 1000) || null;
  if (!title) {
    await admin.storage.from(GALLERY_BUCKET).remove([input.storagePath]);
    return { ok: false, error: "Give the image a title." };
  }

  const { error: insertError } = await admin.from("gallery_images").insert({
    storage_path: input.storagePath,
    title,
    caption,
    uploaded_by: s.userId,
    uploader_name: s.callsign,
  });
  if (insertError) {
    await admin.storage.from(GALLERY_BUCKET).remove([input.storagePath]);
    return { ok: false, error: `The gallery entry could not be saved: ${insertError.message}` };
  }

  revalidatePath("/gallery");
  return { ok: true };
}

export async function deleteGalleryImage(formData: FormData) {
  const s = await requireSession();
  if (!s.caps.has("gallery.manage")) galleryError("You do not have permission to remove gallery images.");

  const id = String(formData.get("id") || "");
  const admin = supaAdmin();
  const { data: image, error: lookupError } = await admin
    .from("gallery_images")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (lookupError || !image) galleryError("That gallery image could not be found.");

  const { error: storageError } = await admin.storage.from(GALLERY_BUCKET).remove([image.storage_path]);
  if (storageError) galleryError(`The stored image could not be removed: ${storageError.message}`);

  const { error: deleteError } = await admin.from("gallery_images").delete().eq("id", id);
  if (deleteError) galleryError(`The gallery entry could not be removed: ${deleteError.message}`);

  revalidatePath("/gallery");
  redirect("/gallery?deleted=1");
}
