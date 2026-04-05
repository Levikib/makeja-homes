"use client";
import { useState, useEffect } from "react";
import NewExpenseClient from "./NewExpenseClient";

export const dynamic = 'force-dynamic';

export default function NewExpensePage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/properties")
      .then(r => r.json())
      .then(d => {
        setProperties(Array.isArray(d) ? d : (d.properties ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return <NewExpenseClient properties={properties} />;
}
