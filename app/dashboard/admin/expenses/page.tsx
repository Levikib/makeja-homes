"use client";
import { useState, useEffect } from "react";
import ExpensesClient from "./ExpensesClient";

export const dynamic = 'force-dynamic';

export default function ExpensesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/expenses")
      .then(r => r.json())
      .then(d => {
        setData({
          expenses: d.expenses ?? [],
          properties: [],
          stats: d.stats ?? { totalExpenses: 0, thisMonthTotal: 0, expenseCount: 0, thisMonthCount: 0 },
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-white p-6">Loading expenses...</div>;
  if (!data) return <div className="text-white p-6">Failed to load expenses.</div>;

  return <ExpensesClient expenses={data.expenses} properties={data.properties} stats={data.stats} />;
}
