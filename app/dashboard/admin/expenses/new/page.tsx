import { Metadata } from "next";
import NewExpenseClient from "./NewExpenseClient";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "New Expense | Makeja Homes",
  description: "Add a new expense",
};

export default async function NewExpensePage() {
  // Get all properties for the dropdown
  const properties = await prisma.properties.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return <NewExpenseClient properties={properties} />;
}
