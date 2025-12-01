import React from 'react';

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, size = 150 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center h-full text-slate-500">
                 <div style={{width: size, height: size}} className="flex items-center justify-center bg-slate-800/50 rounded-full border-2 border-dashed border-slate-700 mb-4">
                    <span className="text-sm">Sem dados</span>
                </div>
                <p className="text-sm">Nenhum dado para exibir.</p>
            </div>
        );
    }

    let cumulativePercentage = 0;

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <svg width={size} height={size} viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
                {data.map((segment, index) => {
                    const percentage = segment.value / total;
                    const dashArray = 2 * Math.PI;
                    
                    cumulativePercentage += percentage;

                    return (
                        <circle
                            key={index}
                            r="0.5"
                            cx="0"
                            cy="0"
                            fill="transparent"
                            stroke={segment.color}
                            strokeWidth="1"
                            strokeDasharray={`${dashArray * percentage} ${dashArray * (1 - percentage)}`}
                            strokeDashoffset={-dashArray * (cumulativePercentage - percentage)}
                        />
                    );
                })}
            </svg>
            <ul className="w-full max-w-xs space-y-1 text-sm pt-4 mt-2 border-t border-slate-700">
                {data.map((segment, index) => (
                    <li key={index} className="flex items-center justify-between">
                         <div className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: segment.color }}></span>
                            <span className="text-slate-300">{segment.label}</span>
                        </div>
                        <span className="font-semibold text-slate-100">{segment.value} ({Math.round((segment.value / total) * 100)}%)</span>
                    </li>
                ))}
                 <li className="flex items-center justify-between border-t border-slate-700 pt-2 mt-2">
                    <span className="text-slate-300 font-bold">Total:</span>
                    <span className="font-bold text-slate-100">{total}</span>
                </li>
            </ul>
        </div>
    );
};

export default PieChart;
