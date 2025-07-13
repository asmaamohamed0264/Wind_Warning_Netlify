'use client';

import { ForecastData } from '@/types/weather';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';

interface ForecastChartProps {
  data: ForecastData[];
  threshold?: number;
}

export function ForecastChart({ data, threshold = 50 }: ForecastChartProps) {
  const chartData = data.map((forecast, index) => {
    const time = new Date(forecast.time);
    const hour = time.getHours();
    const isNow = index === 0;
    
    return {
      time: isNow ? 'Now' : `${hour.toString().padStart(2, '0')}:00`,
      windSpeed: Math.round(forecast.windSpeed),
      windGust: Math.round(forecast.windGust),
      maxWind: Math.max(Math.round(forecast.windSpeed), Math.round(forecast.windGust)),
      hour: isNow ? -1 : hour, // Use -1 for "Now" to sort it first
    };
  });

  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.windSpeed, d.windGust)),
    threshold + 20
  );

  const getWindRiskColor = (windSpeed: number) => {
    if (windSpeed >= threshold * 1.5) return '#ef4444'; // red-500
    if (windSpeed >= threshold * 1.2) return '#f59e0b'; // amber-500
    if (windSpeed >= threshold) return '#eab308'; // yellow-500
    return '#10b981'; // emerald-500
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickLine={false}
            label={{ 
              value: 'Wind Speed (km/h)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#9ca3af' }
            }}
            domain={[0, maxValue]}
          />
          
          {/* Threshold line */}
          <ReferenceLine 
            y={threshold} 
            stroke="#f59e0b" 
            strokeDasharray="5 5" 
            strokeWidth={2}
          />
          
          {/* Wind gust area */}
          <Area
            type="monotone"
            dataKey="windGust"
            stroke="#60a5fa"
            fill="#60a5fa"
            fillOpacity={0.1}
            strokeWidth={0}
          />
          
          {/* Wind speed line */}
          <Line
            type="monotone"
            dataKey="windSpeed"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6, fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 2 }}
          />
          
          {/* Wind gust line */}
          <Line
            type="monotone"
            dataKey="windGust"
            stroke="#60a5fa"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={{ r: 3, fill: '#60a5fa' }}
            activeDot={{ r: 5, fill: '#60a5fa', stroke: '#2563eb', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Threshold indicator */}
      <div className="flex justify-center mb-2">
        <div className="flex items-center text-sm text-yellow-500">
          <div className="w-6 h-0.5 bg-yellow-500 border-dashed border-t mr-2" style={{borderTopStyle: 'dashed'}}></div>
          <span>Alert Threshold: {threshold} km/h</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center items-center mt-4 space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
          <span className="text-gray-300">Wind Speed</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-blue-400 border-dashed border-t mr-2" style={{borderTopStyle: 'dashed'}}></div>
          <span className="text-gray-300">Wind Gusts</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-0.5 bg-yellow-500 border-dashed border-t mr-2" style={{borderTopStyle: 'dashed'}}></div>
          <span className="text-gray-300">Alert Threshold</span>
        </div>
      </div>
      
      {/* Risk indicators */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {chartData.slice(0, 4).map((point, index) => (
          <div 
            key={index}
            className="bg-gray-700/30 rounded p-2 text-center"
          >
            <div className="font-medium text-gray-300">{point.time}</div>
            <div 
              className="font-bold text-lg"
              style={{ color: getWindRiskColor(point.maxWind) }}
            >
              {point.maxWind} km/h
            </div>
            <div className="text-gray-400">
              {point.maxWind >= threshold ? 'Alert' : 'Normal'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}