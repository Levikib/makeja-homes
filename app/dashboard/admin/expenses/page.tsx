import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Plus } from "lucide-react";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  await requireRole(["ADMIN", "MANAGER"]);
  const properties = await prisma.properties.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const expenses = await prisma.expenses.findMany({ orderBy: { date: "desc" } });
  const expensesWithProperties = await Promise.all(
    expenses.map(async (expense) => {
      const property = await prisma.properties.findUnique({
        where: { id: expense.propertyId },
        select: { id: true, name: true },
      });
      return { ...expense, properties: property || { id: expense.propertyId, name: "Unknown" } };
    })
  );
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthExpenses = expensesWithProperties.filter(e => {
    const expenseDate = new Date(e.date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });
  const totalExpenses = expensesWithProperties.reduce((sum, e) => sum + Number(e.amount), 0);
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const stats = {
    totalExpenses,
    thisMonthTotal,
    expenseCount: expensesWithProperties.length,
    thisMonthCount: thisMonthExpenses.length,
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-4xl">💰</span> Expenses
          </h1>
          <p className="text-gray-400 mt-1">Track and manage business expenses</p>
        </div>
        <Link href="/dashboard/admin/expenses/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all">
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </Link>
      </div>
      <ExpensesClient expenses={expensesWithProperties} properties={properties} stats={stats} />
    </div>
  );
}
