export type DocStatus = "Processing" | "Embedded" | "Error";

export type DocRecord = {
  id: string;
  title: string;
  version: number;
  status: DocStatus;
  uploadedAt: string;
  tags?: string[];
};

const state: { docs: DocRecord[] } = {
  docs: Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    title: `Document ${i + 1}`,
    version: 1,
    status: (i % 3 === 0 ? "Embedded" : i % 3 === 1 ? "Processing" : "Error") as DocStatus,
    uploadedAt: new Date(Date.now() - i * 3600_000).toISOString(),
    tags: ["tag" + ((i % 5) + 1)],
  })),
};

export function listDocs(page: number, limit: number) {
  const start = (page - 1) * limit;
  const items = state.docs.slice(start, start + limit);
  const totalPages = Math.max(1, Math.ceil(state.docs.length / limit));
  return { items, totalPages };
}

export function getDoc(id: string) {
  return state.docs.find((d) => d.id === id) || null;
}

export function upsertDoc(doc: DocRecord) {
  const idx = state.docs.findIndex((d) => d.id === doc.id);
  if (idx >= 0) state.docs[idx] = doc;
  else state.docs.unshift(doc);
  return doc;
}

export function removeDoc(id: string) {
  const before = state.docs.length;
  state.docs = state.docs.filter((d) => d.id !== id);
  return state.docs.length < before;
}


