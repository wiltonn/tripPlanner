"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SearchResult } from "@trip-planner/core";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ActivitySearchProps {
  mapCenter?: [number, number];
  onSelect: (result: SearchResult) => void;
}

export default function ActivitySearch({ mapCenter, onSelect }: ActivitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q, limit: "5" });
        if (mapCenter) {
          params.set("proximity", `${mapCenter[0]},${mapCenter[1]}`);
        }
        const res = await fetch(`${API_BASE}/search/places?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [mapCenter]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.name);
    setOpen(false);
    setResults([]);
    onSelect(result);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="activity-search" ref={containerRef}>
      <input
        className="overlay-form-input activity-search-input"
        type="text"
        placeholder="Search for a place..."
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && <div className="activity-search-loading">Searching...</div>}
      {open && results.length > 0 && (
        <div className="activity-search-dropdown">
          {results.map((r) => (
            <button
              key={r.id}
              className="activity-search-result"
              onClick={() => handleSelect(r)}
            >
              <span className="activity-search-name">{r.name}</span>
              <span className="activity-search-detail">
                {r.address || r.context}
                {r.category && r.category !== "place" && ` · ${r.category}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
