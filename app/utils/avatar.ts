export function getAvatarSrc(address: string | null | undefined): string {
  if (!address) return "/avatar1.png";
  const idx = [...address].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 3;
  return `/avatar${idx + 1}.png`;
}
