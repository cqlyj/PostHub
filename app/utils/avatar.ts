export function getAvatarSrc(address: string | null | undefined): string {
  if (!address) return "/avatar1.png";
  // Use first 8 hex chars of address as a deterministic seed
  const clean = address.toLowerCase().replace(/^0x/, "");
  const seed = parseInt(clean.substring(0, 8), 16);
  const idx = seed % 3; // now 0,1,2 roughly uniformly distributed
  return `/avatar${idx + 1}.png`;
}
