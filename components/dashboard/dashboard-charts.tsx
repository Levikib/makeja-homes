"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface UnitDistribution {
  occupied: number;
  vacant: number;
  maintenance: number;
}

interface PropertyOccupancy {
  name: string;
  total: number;
  occupied: number;
}

interface DashboardChartsProps {
  unitDistribution: UnitDistribution;
  propertyOccupancy: PropertyOccupancy[];
}

const COLORS = {
  occupied: "#10b981",
  vacant: "#f59e0b",
  maintenance: "#ef4444",
};

export default function DashboardCharts({ unitDistribution, propertyOccupancy }: DashboardChartsProps) {
  const pieData = [
    { name: "Occupied", value: unitDistribution.occupied, color: COLORS.occupied },
    { name: "Vacant", value: unitDistribution.vacant, color: COLORS.vacant },
    { name: "Maintenance", value: unitDistribution.maintenance, color: COLORS.maintenance },
  ].filter(item => item.value > 0);

  const barData = propertyOccupancy.map(property => ({
    name: property.name,
    total: property.total,
    occupied: property.occupied,
    vacant: property.total - property.occupied,
    occupancyRate: property.total > 0 ? ((property.occupied / property.total) * 100).toFixed(1) : 0,
  }));

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value} units</p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-sm text-green-600">Occupied: {payload[0].value}</p>
          <p className="text-sm text-orange-600">Vacant: {payload[1].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Unit Status Distribution</CardTitle>
          <CardDescription>Overview of all units by status</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Occupancy by Property</CardTitle>
          <CardDescription>Occupied vs vacant units per property</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<BarTooltip />} />
              <Legend />
              <Bar dataKey="occupied" fill="#10b981" name="Occupied" />
              <Bar dataKey="vacant" fill="#f59e0b" name="Vacant" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
