export const isVideoUrl = (url: string): boolean => {
  return /\.(mp4|mov|webm|mkv)$/i.test(url.split("?")[0]); // ignore query params
};

// Future: more sophisticated motion-photo detection can be added here (eg. pairing JPEG & MOV or parsing XMP metadata)

export const extractSamsungMotionPhoto = async (
  file: File
): Promise<Blob | null> => {
  if (file.type !== "image/jpeg") return null;
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Decode only the first 512k for metadata to save memory
    const head = new TextDecoder().decode(bytes.slice(0, 512 * 1024));
    const match = head.match(/MicroVideoOffset="(\d+)"/);
    if (!match) return null;
    const offset = parseInt(match[1], 10);
    if (!Number.isFinite(offset) || offset <= 0 || offset >= bytes.length) {
      return null;
    }
    const videoBytes = bytes.slice(offset);
    return new Blob([videoBytes], { type: "video/mp4" });
  } catch (err) {
    console.warn("Motion photo parse failed", err);
    return null;
  }
};
