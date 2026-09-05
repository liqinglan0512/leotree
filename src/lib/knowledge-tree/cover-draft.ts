import { indexedBlobStore, prepareFile, type BlobStore } from "./files.ts";
import { browserExclusive, type Exclusive } from "./service.ts";
import { DataError } from "./validation.ts";
/** A cancelled cover selection never writes bytes. The final metadata callback runs under the write lock. */
export class CoverDraft {
  private generation = 0;
  private candidate: { id: string; blob: Blob } | null = null;
  async select(file: File) {
    const generation = ++this.generation;
    const prepared = await prepareFile(file);
    if (prepared.metadata.kind !== "png") throw new DataError("FILE_UNSUPPORTED","Cover must be PNG");
    if (generation !== this.generation) return null;
    this.candidate = { id: prepared.metadata.id, blob: prepared.blob }; return prepared.blob;
  }
  cancel() { this.generation++; this.candidate = null; }
  async save(commit: (reference: string) => void, blobs: BlobStore = indexedBlobStore, exclusive: Exclusive = browserExclusive) {
    const candidate = this.candidate; const generation = this.generation;
    if (!candidate) throw new DataError("NOT_FOUND","No cover draft");
    return exclusive(async () => {
      if (generation !== this.generation) return false;
      await blobs.putMany([[candidate.id,candidate.blob]]);
      if (generation !== this.generation) { await blobs.deleteMany([candidate.id]); return false; }
      try { commit(`cover:${candidate.id}`); this.cancel(); return true; }
      catch(error) { await blobs.deleteMany([candidate.id]); throw error; }
    });
  }
}
