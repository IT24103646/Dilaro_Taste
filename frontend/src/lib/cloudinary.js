import { api } from "./api.js";

export function isCloudinaryUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === "res.cloudinary.com" || u.hostname.endsWith(".cloudinary.com");
  } catch {
    return false;
  }
}

// Best-effort: derive Cloudinary public_id from a standard delivery URL.
// Example: https://res.cloudinary.com/<cloud>/image/upload/v1234/folder/name.jpg -> folder/name
export function getCloudinaryPublicIdFromUrl(url) {
  try {
    const u = new URL(url);
    const marker = "/upload/";
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    let tail = u.pathname.slice(idx + marker.length);

    const versionMatch = tail.match(/(^|\/)v\d+\//);
    if (versionMatch) {
      tail = tail.slice((versionMatch.index || 0) + versionMatch[0].length);
    }

    tail = tail.replace(/\.[^./]+$/, "");
    tail = tail.replace(/^\/+/, "");
    return decodeURIComponent(tail || "").trim() || null;
  } catch {
    return null;
  }
}

export async function uploadImageToCloudinary(file, { folder } = {}) {
  if (!(file instanceof File)) {
    throw new Error("uploadImageToCloudinary: file must be a File");
  }

  let signRes;
  try {
    signRes = await api.post("/api/uploads/cloudinary/sign", {
      folder,
      resourceType: "image"
    });
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || "Failed to sign Cloudinary upload";
    throw new Error(msg);
  }

  const { timestamp, signature, apiKey, cloudName, resourceType: resourceTypeFromServer, folder: signedFolder } = signRes.data;
  const resourceType = resourceTypeFromServer || "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", signedFolder);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const uploadRes = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Cloudinary upload failed: ${uploadRes.status} ${text}`);
  }

  const json = await uploadRes.json();
  return {
    url: json.secure_url || json.url,
    publicId: json.public_id,
    width: json.width,
    height: json.height,
    format: json.format,
    bytes: json.bytes
  };
}
