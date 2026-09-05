import { useEffect, useState } from "react";
import { coverBlobId, isCoverRef } from "@/lib/garden-art";
import { getBlob } from "@/lib/knowledge-tree/files";

export function GardenArt({ art, className }: { art: string; className?: string }) {
  const [src, setSrc] = useState(() => (isCoverRef(art) ? "" : art));
  useEffect(() => {
    if (!isCoverRef(art)) {
      setSrc(art);
      return;
    }
    let gone = false;
    let objectUrl: string | null = null;
    void getBlob(coverBlobId(art)).then((blob) => {
      if (gone || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    });
    return () => {
      gone = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [art]);
  return <div className={className} style={src ? { backgroundImage: `url(${src})` } : undefined} />;
}
