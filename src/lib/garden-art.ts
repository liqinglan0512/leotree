export const COVER_PREFIX = "cover:";

export function isCoverRef(art: string) {
  return art.startsWith(COVER_PREFIX);
}

export function coverBlobId(art: string) {
  return art.slice(COVER_PREFIX.length);
}

export function coverRef(id: string) {
  return `${COVER_PREFIX}${id}`;
}
