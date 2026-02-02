import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AreaChartProps {
  data: any[];
  dataKeys: string[];
  xKey: string;
  colors?: string[];
  height?: number;
  animated?: boolean;
  yDomain?: [number | string, number | string];
}

// Ultra-vibrant colors for "colorful and effective" look
const defaultColors = ['#00E5FF', '#2979FF', '#651FFF', '#D500F9', '#F50057'];

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  dataKeys,
  xKey,
  colors = defaultColors,
  height = 300,
  animated = true,
  yDomain,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.5 }}
      style={{ height: height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart
          data={data}
          margin={{
            top: 20,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            {dataKeys.map((key, index) => {
              const color = colors[index % colors.length];
              return (
                <React.Fragment key={key}>
                  {/* Gradient for the Fill */}
                  <linearGradient id={`color${key.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.6} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                  {/* Glow Filter for the Stroke */}
                  <filter id={`glow${key.replace(/\s+/g, '')}`} height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                    <feOffset in="blur" dx="0" dy="2" result="offsetBlur" />
                    <feFlood floodColor={color} floodOpacity="0.5" result="offsetColor" />
                    <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
                    <feMerge>
                      <feMergeNode in="offsetBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </React.Fragment>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-100 dark:stroke-gray-800" />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
            dy={10}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            domain={yDomain}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              color: '#1f2937',
              padding: '12px',
            }}
            itemStyle={{ color: '#374151', fontSize: '13px', fontWeight: 600, paddingBottom: '4px' }}
            cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '4 4' }}
            labelStyle={{ color: '#9CA3AF', marginBottom: '8px' }}
          />
          {dataKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={colors[index % colors.length]}
              strokeWidth={3}
              fill={`url(#color${key.replace(/\s+/g, '')})`}
              filter={`url(#glow${key.replace(/\s+/g, '')})`}
              animationDuration={animated ? 1500 : 0}
              animationEasing="ease-out"
              activeDot={{
                r: 6,
                strokeWidth: 4,
                stroke: '#fff',
                fill: colors[index % colors.length]
              }}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};
