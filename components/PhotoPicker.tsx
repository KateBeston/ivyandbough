"use client";

import { useEffect, useMemo, useRef } from "react";

// Shrinks photos before upload so phone pictures stay well under the upload limit.
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function PhotoPicker({ photos, setPhotos, max, required }: { photos: File[]; setPhotos: (f: File[]) => void; max: number; required?: boolean }) {
  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  async function add(list: FileList | null) {
    if (!list) return;
    const next = await Promise.all([...list].slice(0, max - photos.length).map(shrink));
    setPhotos([...photos, ...next].slice(0, max));
    if (camera.current) camera.current.value = "";
    if (files.current) files.current.value = "";
  }

  return (
    <fieldset className="photo-picker">
      <legend>Photos{required ? "" : " (optional)"}</legend>
      <p className="muted">Clear photos help us sort this out faster. Add up to {max}.</p>
      {photos.length > 0 && (
        <div className="photo-thumbs">
          {previews.map((u, n) => (
            <div key={u} className="photo-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Photo ${n + 1}`} />
              <button type="button" aria-label={`Remove photo ${n + 1}`} onClick={() => setPhotos(photos.filter((_, i) => i !== n))}>×</button>
            </div>
          ))}
        </div>
      )}
      {photos.length < max && (
        <div className="photo-buttons">
          <button type="button" className="outline" onClick={() => camera.current?.click()}>Take a photo</button>
          <button type="button" className="outline" onClick={() => files.current?.click()}>Upload photos</button>
        </div>
      )}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => add(e.target.files)} />
      <input ref={files} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden onChange={(e) => add(e.target.files)} />
    </fieldset>
  );
}
