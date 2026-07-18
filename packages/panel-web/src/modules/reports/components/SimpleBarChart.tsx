import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartAccentColor, useChartAxisColor, useChartGridColor } from '@/shared/utils/chartColors';
import { cn } from '@/shared/utils/cn';

interface SimpleBarChartProps {
  data: Array<{ label: string; value: number }>;
  valueFormatter?: (value: number) => string;
  height?: number;
  className?: string;
}

export function SimpleBarChart({ data, valueFormatter = (v) => String(v), height = 240, className }: SimpleBarChartProps) {
  const accent = useChartAccentColor();
  const axis = useChartAxisColor();
  const grid = useChartGridColor();

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey="label" tick={{ fill: axis, fontSize: 12 }} axisLine={{ stroke: grid }} tickLine={false} />
          <YAxis tick={{ fill: axis, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            formatter={(value: number) => valueFormatter(value)}
            contentStyle={{ borderRadius: 8, borderColor: grid, fontSize: 12 }}
            cursor={{ fill: grid, opacity: 0.3 }}
          />
          <Bar dataKey="value" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
