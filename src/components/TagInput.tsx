"use client";

import { useState } from "react";

const MAX_TAGS = 5;

export default function TagInput({ defaultTags = [] }: { defaultTags?: string[] }) {
  const [tags, setTags] = useState(defaultTags);
  const [draft, setDraft] = useState("");

  function addDraft() {
    const next = draft.trim().replace(/^#/, "");
    if (!next || tags.length >= MAX_TAGS || tags.some((tag) => tag.toLocaleLowerCase() === next.toLocaleLowerCase())) {
      setDraft("");
      return;
    }
    setTags((current) => [...current, next]);
    setDraft("");
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">แท็ก <span className="font-normal text-slate-400">กด Enter เพื่อเพิ่ม · {tags.length}/{MAX_TAGS}</span></span>
      <input type="hidden" name="tags" value={tags.join(",")} />
      <div className="field flex min-h-10 flex-wrap items-center gap-1.5 py-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] text-indigo-700">
            #{tag}
            <button type="button" aria-label={`ลบแท็ก ${tag}`} onClick={() => setTags((current) => current.filter((item) => item !== tag))} className="text-indigo-400 hover:text-rose-500">×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.ctrlKey || event.metaKey) return;
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addDraft();
            } else if (event.key === "Backspace" && !draft && tags.length) {
              setTags((current) => current.slice(0, -1));
            }
          }}
          onBlur={addDraft}
          disabled={tags.length >= MAX_TAGS}
          aria-label="เพิ่มแท็ก"
          placeholder={tags.length ? "เพิ่มแท็ก…" : "เช่น บ้าน แล้วกด Enter"}
          className="min-w-28 flex-1 bg-transparent py-0.5 text-xs outline-none placeholder:text-slate-400 disabled:hidden"
        />
      </div>
    </label>
  );
}
