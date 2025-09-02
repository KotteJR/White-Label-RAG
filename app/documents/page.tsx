"use client";

import { useEffect, useRef, useState } from "react";

type DocumentItem = {
  id: string;
  title: string;
  version: number;
  status: "Processing" | "Embedded" | "Error";
  uploadedAt: string;
  tags?: string[];
};

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaTags, setMetaTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      try {
        const data = await fetch(`/api/documents?page=${page}`).then((r) => r.json());
        setItems(data.items);
        setTotalPages(data.totalPages || 1);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, [page]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      // Show naive progress to done
      files.forEach((f) => setProgressMap((m) => ({ ...m, [f.name]: 100 })));
      // Refresh list
      const data = await fetch(`/api/documents?page=${page}`).then((r) => r.json());
      setItems(data.items);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (doc: DocumentItem) => {
    setEditing(doc);
    setMetaTitle(doc.title);
    setMetaTags((doc.tags || []).join(", "));
  };

  const saveMeta = async () => {
    if (!editing) return;
    try {
      await fetch(`/api/documents/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: metaTitle, tags: metaTags.split(",").map((t) => t.trim()).filter(Boolean) }),
      });
      setItems((arr) => arr.map((d) => (d.id === editing.id ? { ...d, title: metaTitle, tags: metaTags.split(",").map((t) => t.trim()).filter(Boolean) } : d)));
      setEditing(null);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) return <div className="animate-pulse">Loading documents...</div>;
  if (error)
    return (
      <div className="space-y-2">
        <div className="text-red-600">{error}</div>
        <button className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50" onClick={() => location.reload()}>
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} accept=".pdf,.docx,.pptx,.txt" type="file" multiple className="hidden" onChange={onUpload} />
          <button
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-700"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload
          </button>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          {Object.entries(progressMap).map(([name, p]) => (
            <div key={name} className="text-sm">
              {name}
              <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-800">
                <div className="h-2 rounded bg-blue-500" style={{ width: `${p}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pl-1">Title</th>
              <th className="py-2">Version</th>
              <th className="py-2">Status</th>
              <th className="py-2">Uploaded</th>
              <th className="py-2 pr-1 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/70">
            {items.map((d) => (
              <tr key={d.id}>
                <td className="py-3 pl-1">{d.title}</td>
                <td className="py-3">v{d.version}</td>
                <td className="py-3">
                  <span
                    className={
                      d.status === "Embedded"
                        ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"
                        : d.status === "Processing"
                        ? "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"
                        : "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700"
                    }
                  >
                    {d.status}
                  </span>
                </td>
                <td className="py-3 text-gray-600">{new Date(d.uploadedAt).toLocaleString()}</td>
                <td className="py-3 pr-1 text-right space-x-2">
                  <button className="rounded-md px-2 py-1 text-gray-700 hover:bg-gray-50" onClick={() => openEdit(d)}>Edit</button>
                  <button className="rounded-md px-2 py-1 text-gray-700 hover:bg-gray-50" onClick={() => alert("Reupload not implemented in mock")}>Reupload</button>
                  <button
                    className="rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
                    onClick={async () => {
                      await fetch(`/api/documents/${d.id}`, { method: "DELETE" });
                      setItems((arr) => arr.filter((x) => x.id !== d.id));
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-md px-3 py-1 disabled:opacity-50 hover:bg-gray-50 border"
        >
          Prev
        </button>
        <div>Page {page} of {totalPages}</div>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="rounded-md px-3 py-1 disabled:opacity-50 hover:bg-gray-50 border"
        >
          Next
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-4 border border-gray-200 shadow-sm">
            <div className="mb-4 text-lg font-semibold">Edit Metadata</div>
            <div className="space-y-3">
              <label className="block text-sm">
                <div>Title</div>
                <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-transparent px-2 py-1" />
              </label>
              <label className="block text-sm">
                <div>Tags (comma separated)</div>
                <input value={metaTags} onChange={(e) => setMetaTags(e.target.value)} className="mt-1 w-full rounded border border-gray-300 bg-transparent px-2 py-1" />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2 text-sm">
              <button className="rounded-md border px-3 py-1 hover:bg-gray-50" onClick={() => setEditing(null)}>Cancel</button>
              <button className="rounded-md bg-gray-900 px-3 py-1 text-white hover:bg-gray-700" onClick={saveMeta}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


