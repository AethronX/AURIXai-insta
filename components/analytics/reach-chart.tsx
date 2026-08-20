"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReachChart({ data }: { data: Array<{ date: string; reach: number; engagementRate: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reach & engagement over time</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted">No data yet.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted)" />
                <YAxis yAxisId="reach" tick={{ fontSize: 11 }} stroke="var(--muted)" />
                <YAxis yAxisId="rate" orientation="right" tick={{ fontSize: 11 }} stroke="var(--muted)" />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Line yAxisId="reach" type="monotone" dataKey="reach" stroke="var(--brand)" strokeWidth={2} dot={false} name="Reach" />
                <Line yAxisId="rate" type="monotone" dataKey="engagementRate" stroke="var(--success)" strokeWidth={2} dot={false} name="Engagement %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
