"use client";
import { useState, useEffect } from "react";
import NewInventoryClient from "./NewInventoryClient";

export const dynamic = 'force-dynamic';

export default function NewInventoryPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/properties")
      .then(r => r.json())
      .then(d => { setProperties(Array.isArray(d) ? d : (d.properties ?? [])); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return <NewInventoryClient properties={properties} />;
}
