import Image from "next/image";
import Fleuron from "@/components/Fleuron";
import GalleryUploadForm from "@/components/GalleryUploadForm";
import SubmitButton from "@/components/SubmitButton";
import { requireSession } from "@/lib/auth";
import { GALLERY_BUCKET } from "@/lib/gallery";
import { supaServer } from "@/lib/supabase/server";
import { deleteGalleryImage } from "./actions";

export const dynamic = "force-dynamic";

type GalleryImage = {
  id: string;
  storage_path: string;
  title: string;
  caption: string | null;
  uploader_name: string;
  created_at: string;
};

type GalleryParams = Promise<{ e?: string; uploaded?: string; deleted?: string }>;

export default async function Gallery({ searchParams }: { searchParams: GalleryParams }) {
  const [s, params] = await Promise.all([requireSession(), searchParams]);
  const supabase = await supaServer();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("id, storage_path, title, caption, uploader_name, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load the gallery: ${error.message}`);

  const images = (data ?? []) as GalleryImage[];
  const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const withUrls = images.map((image) => ({
    ...image,
    url: `${storageBase}/storage/v1/object/public/${GALLERY_BUCKET}/${image.storage_path.split("/").map(encodeURIComponent).join("/")}`,
  }));

  return (
    <>
      <div className="page-head">
        <h1>The Gallery</h1>
        <span className="sub">Relics, victories, and memories of the Order</span>
      </div>
      <Fleuron label="Visions Preserved" />

      {params.e && <p className="notice error" role="alert">{params.e}</p>}
      {params.uploaded && <p className="notice success" role="status">The image has joined the Gallery.</p>}
      {params.deleted && <p className="notice success" role="status">The image was removed from the Gallery.</p>}

      {s.caps.has("gallery.upload") && (
        <details className="card gallery-upload" open={images.length === 0}>
          <summary>Upload an image</summary>
          <GalleryUploadForm />
        </details>
      )}

      {!withUrls.length ? (
        <p className="empty">No visions have been preserved yet.</p>
      ) : (
        <div className="gallery-grid">
          {withUrls.map((image, index) => (
            <article className="gallery-card" key={image.id}>
              <a className="gallery-image" href={image.url} target="_blank" rel="noreferrer" aria-label={`Open ${image.title} at full size`}>
                <Image
                  src={image.url}
                  alt={image.title}
                  fill
                  sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  priority={index < 2}
                />
              </a>
              <div className="gallery-copy">
                <h2>{image.title}</h2>
                {image.caption && <p>{image.caption}</p>}
                <div className="gallery-meta">
                  <span>Filed by {image.uploader_name}</span>
                  <time dateTime={image.created_at}>{new Date(image.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
                </div>
                {s.caps.has("gallery.manage") && (
                  <form action={deleteGalleryImage}>
                    <input type="hidden" name="id" value={image.id} />
                    <SubmitButton className="btn small" pendingText="Removing…">Remove image</SubmitButton>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
