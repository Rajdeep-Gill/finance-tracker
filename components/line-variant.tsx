import { format } from "date-fns";

import {
  Tooltip,
  XAxis,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  YAxis
} from "recharts";

import { CustomTooltip } from "./custom-tooltip";

type Props = {
  data: {
    date: string;
    income: number;
    expenses: number;
  }[];
};


export const LineVariant = ({ data }: Props) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          axisLine={false}
          tickLine={false}
          dataKey="date"
          tickFormatter={(value) => format(value, "MMM dd")}
          style={{ fontSize: "12px" }}
          tickMargin={16}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickCount={5}
          style={{ fontSize: "12px" }}
          tickMargin={4}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          dot={false}
          type="monotone"
          dataKey="income"
          strokeWidth={2}
          stroke="#3d82f6"
          className="drop-shadow-sm"
        />
        <Line
          dot={false}
          type="monotone"
          dataKey="expenses"
          strokeWidth={2}
          stroke="#f43f5e"
          className="drop-shadow-sm"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}