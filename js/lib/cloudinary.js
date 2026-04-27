/**
 * cloudinary.js
 * Upload unsigned (sans backend) vers Cloudinary.
 *
 * Doc: https://cloudinary.com/documentation/upload_images#unsigned_upload
 */

export async function uploadImageUnsigned({ file, cloudName, uploadPreset, folder }) {
  if (!file) throw new Error("Aucun fichier");
  if (!cloudName) throw new Error("cloudName manquant");
  if (!uploadPreset) throw new Error("uploadPreset manquant");

  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);
  if (folder) fd.append("folder", folder);

  const res = await fetch(url, { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Upload Cloudinary échoué (${res.status})`;
    throw new Error(msg);
  }
  return {
    url: json.secure_url || json.url,
    publicId: json.public_id,
    width: json.width,
    height: json.height,
    format: json.format,
    bytes: json.bytes,
  };
}

export async function uploadRawUnsigned({ file, cloudName, uploadPreset, folder, publicId, overwrite = true }) {
  if (!file) throw new Error("Aucun fichier");
  if (!cloudName) throw new Error("cloudName manquant");
  if (!uploadPreset) throw new Error("uploadPreset manquant");

  // Upload raw (ex: JSON). Cloudinary supporte resource_type=raw via endpoint dédié.
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/raw/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", uploadPreset);
  if (folder) fd.append("folder", folder);
  if (publicId) fd.append("public_id", publicId);
  if (overwrite) fd.append("overwrite", "true");

  const res = await fetch(url, { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Upload Cloudinary échoué (${res.status})`;
    throw new Error(msg);
  }
  return {
    url: json.secure_url || json.url,
    publicId: json.public_id,
    bytes: json.bytes,
    format: json.format,
  };
}

export function cloudinaryRawUrl({ cloudName, publicId, format = "json" }) {
  // URL de delivery (non signée) pour récupérer un raw.
  // Note: Cloudinary peut renvoyer une URL versionnée après upload; cette URL est la forme stable.
  const pid = String(publicId || "").replace(/^\/+/, "");
  const ext = format ? `.${format}` : "";
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/raw/upload/${pid}${ext}`;
}

