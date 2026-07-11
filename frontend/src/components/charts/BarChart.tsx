import React from 'react';
import { motion } from 'framer-motion';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

interface BarChartProps {
  data: any[];
  dataKey: string;
  xKey: string;
  name?: string;
  color?: string;
  height?: number;
  colors?: string[];
  animated?: boolean;
}

const defaultColors = ['#6B46C1', '#2563EB', '#059669', '#4F46E5', '#14B8A6', '#7C3AED'];

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  xKey,
  name,
  color,
  height = 300,
  colors = defaultColors,
  animated = true,
}) => {


  const chartColor = color || colors[0];

  if (!data || data.length === 0) {
    return (
      <div style={{ height: height }} className="flex items-center justify-center text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id={`barGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity={0.9} />
              <stop offset="100%" stopColor={chartColor} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="stroke-gray-200 dark:stroke-gray-700 opacity-30"
          />
          <XAxis
            dataKey={xKey}
            className="text-xs fill-gray-500 dark:fill-gray-400"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', strokeWidth: 1 }}
          />
          <YAxis
            className="text-xs fill-gray-500 dark:fill-gray-400"
            tick={{ fill: 'currentColor', fontSize: 12 }}
            axisLine={{ stroke: 'currentColor', strokeWidth: 1 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
              padding: '12px',
            }}
            labelStyle={{
              color: 'var(--foreground)',
              fontWeight: 600,
              marginBottom: '8px',
            }}
            itemStyle={{
              color: 'var(--foreground)',
              padding: '4px 0',
            }}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />
          {name && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
          )}
          <Bar
            dataKey={dataKey}
            name={name || dataKey}
            fill={`url(#barGradient-${dataKey})`}
            radius={[12, 12, 0, 0]}
            animationDuration={animated ? 1000 : 0}
            animationBegin={0}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                style={{
                  transition: 'opacity 0.3s ease',
                }}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

