import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LineChartProps {
  data: any[];
  dataKeys: string[];
  xKey: string;
  colors?: string[];
  height?: number;
  animated?: boolean;
}

const defaultColors = ['#6B46C1', '#2563EB', '#059669', '#4F46E5', '#14B8A6'];

export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKeys,
  xKey,
  colors = defaultColors,
  height = 300,
  animated = true,
}) => {


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            cursor={{ stroke: 'rgba(107, 70, 193, 0.2)', strokeWidth: 1 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          {dataKeys.map((key, index) => {
            const color = colors[index % colors.length];
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: color, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#fff' }}
                animationDuration={animated ? 1200 : 0}
                animationBegin={index * 200}
                animationEasing="ease-out"
              />
            );
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

