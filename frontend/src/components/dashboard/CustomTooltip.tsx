import React from 'react';

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900/95 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-xl min-w-[140px]">
                <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest font-black border-b border-white/5 pb-1">
                    {label}
                </p>
                {payload.map((entry: any, index: number) => {
                    const isUtilization = entry.dataKey === 'value' && entry.payload.count !== undefined;
                    return (
                        <div key={index} className="space-y-1 py-1">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: entry.color || entry.fill }}
                                    />
                                    <span className="text-xs font-bold text-gray-300">
                                        {isUtilization ? 'Taken' : entry.name}
                                    </span>
                                </div>
                                <span className="text-xs font-black">
                                    {entry.value}{isUtilization ? '%' : ''}
                                </span>
                            </div>
                            {isUtilization && (
                                <div className="flex items-center justify-between text-[8px] text-gray-500 ml-4 font-black uppercase tracking-tighter">
                                    <span>Count</span>
                                    <span>{entry.payload.count}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};
