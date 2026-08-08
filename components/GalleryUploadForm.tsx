"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createGalleryUpload, discardGalleryUpload, finalizeGalleryUpload } from "@/app/(app)/gallery/actions";
import { GALLERY_BUCKET, MAX_GALLERY_IMAGE_BYTES } from "@/lib/gallery";
import { supaBrowser } from "@/lib/supabase/browser";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function GalleryUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an image to upload.");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_GALLERY_IMAGE_BYTES) {
      setError("Images must be 10 MB or smaller.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("Preparing secure upload…");

    let storagePath = "";
    try {
      const ticket = await createGalleryUpload({ fileSize: file.size, contentType: file.type });
      if (!ticket.ok) {
        setError(ticket.error);
        return;
      }
      storagePath = ticket.path;

      setStatus("Uploading directly to the Gallery…");
      const supabase = supaBrowser();
      const { error: uploadError } = await supabase.storage
        .from(GALLERY_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { cacheControl: "31536000" });
      if (uploadError) {
        setError(`The image could not be uploaded: ${uploadError.message}`);
        await discardGalleryUpload(storagePath);
        return;
      }

      setStatus("Verifying and publishing…");
      const titleInput = String(formData.get("title") || "").trim();
      const fallbackTitle = file.name.replace(/\.[^.]+$/, "").trim() || "Untitled image";
      const result = await finalizeGalleryUpload({
        storagePath,
        title: titleInput || fallbackTitle,
        caption: String(formData.get("caption") || ""),
      });
      if (!result.ok) {
        setError(result.error);
        await discardGalleryUpload(storagePath);
        return;
      }

      storagePath = "";
      formRef.current?.reset();
      router.push("/gallery?uploaded=1");
      router.refresh();
    } catch (cause) {
      if (storagePath) await discardGalleryUpload(storagePath);
      setError(cause instanceof Error ? cause.message : "The upload failed unexpectedly. Please try again.");
    } finally {
      setStatus("");
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={upload}>
      <div className="row">
        <label className="fld"><span>Image</span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy} />
        </label>
        <label className="fld"><span>Title</span>
          <input name="title" type="text" maxLength={120} placeholder="Defaults to the file name" disabled={busy} />
        </label>
      </div>
      <label className="fld"><span>Caption (optional)</span>
        <textarea name="caption" maxLength={1000} rows={3} placeholder="Tell the story behind this image" disabled={busy} />
      </label>
      <p className="small muted">JPEG, PNG, or WebP · Maximum 10 MB</p>
      {error && <p className="notice error small" role="alert">{error}</p>}
      {status && <p className="small gallery-upload-status" role="status">{status}</p>}
      <button className="btn primary" type="submit" disabled={busy}>{busy ? "Uploading…" : "Add to Gallery"}</button>
    </form>
  );
}
