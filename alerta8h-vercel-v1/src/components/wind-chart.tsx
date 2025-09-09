"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface WindChartProps {
  data: Array<{
    time: string
    windSpeed: number
    windGust: number
    threshold: number
  }>
  threshold: number
  className?: string
}

export function WindChart({ data, threshold, className }: WindChartProps) {
  const maxWind = Math.max(
    ...data.map(d => Math.max(d.windSpeed, d.windGust)),
    threshold
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌪️ Prognoză Vânt - 8 Ore
        </CardTitle>
        <CardDescription>
          Viteza vântului și rafalele pentru următoarele 8 ore
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, Math.ceil(maxWind * 1.1)]}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} km/h`,
                  name === 'windSpeed' ? 'Vânt' : name === 'windGust' ? 'Rafale' : 'Prag'
                ]}
                labelFormatter={(label) => `Ora: ${label}`}
              />
              <ReferenceLine 
                y={threshold} 
                stroke="#f59e0b" 
                strokeDasharray="5 5"
                label={{ value: `Prag: ${threshold} km/h`, position: "topRight" }}
              />
              <Line 
                type="monotone" 
                dataKey="windSpeed" 
                stroke="#0ea5e9" 
                strokeWidth={3}
                dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="windGust" 
                stroke="#3b82f6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <span>Vânt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-600 border-2 border-dashed"></div>
            <span>Rafale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500 border-2 border-dashed"></div>
            <span>Prag</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

