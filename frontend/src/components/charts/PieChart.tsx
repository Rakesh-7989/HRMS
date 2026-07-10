import React from 'react';
import { motion } from 'framer-motion';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  height?: number;
  animated?: boolean;
  innerRadius?: number | string;
  outerRadius?: number | string;
}

const DEFAULT_COLORS = ['#6B46C1', '#2563EB', '#059669', '#4F46E5', '#14B8A6', '#7C3AED', '#F59E0B', '#EF4444'];

export const PieChart: React.FC<PieChartProps> = ({
  data,
  colors = DEFAULT_COLORS,
  height = 300,
  animated = true,
  innerRadius,
  outerRadius,
}) => {


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => {
              if (percent < 0.05) return ''; // Hide labels for very small slices
              return `${name}: ${(percent * 100).toFixed(0)}%`;
            }}
            innerRadius={innerRadius}
            outerRadius={outerRadius || height / 4}
            fill="#8884d8"
            dataKey="value"
            animationDuration={animated ? 1000 : 0}
            animationBegin={0}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  transition: 'opacity 0.3s ease',
                }}
              />
            ))}
          </Pie>
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
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

