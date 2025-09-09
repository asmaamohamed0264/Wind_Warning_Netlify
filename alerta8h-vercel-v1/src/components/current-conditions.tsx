"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getWindDirection, getRiskLevel, getRiskColor, formatWindSpeed, formatTemperature } from '@/lib/utils'
import { Wind, Thermometer, Droplets, Gauge, Eye, Compass } from 'lucide-react'

interface CurrentConditionsProps {
  data: {
    windSpeed: number
    windGust?: number
    windDirection: number
    temperature: number
    humidity: number
    pressure: number
    visibility: number
    description: string
    provider: string
    timestamp: number
  }
  threshold: number
  className?: string
}

export function CurrentConditions({ data, threshold, className }: CurrentConditionsProps) {
  const risk = getRiskLevel(data.windSpeed, threshold)
  const riskColor = getRiskColor(risk)
  
  const conditions = [
    {
      icon: Wind,
      label: 'Vânt',
      value: formatWindSpeed(data.windSpeed),
      subtitle: data.windGust ? `Rafale: ${formatWindSpeed(data.windGust)}` : undefined,
      color: riskColor
    },
    {
      icon: Compass,
      label: 'Direcție',
      value: getWindDirection(data.windDirection),
      subtitle: `${data.windDirection.toFixed(0)}°`,
      color: 'text-blue-400'
    },
    {
      icon: Thermometer,
      label: 'Temperatură',
      value: formatTemperature(data.temperature),
      subtitle: 'Aer',
      color: 'text-orange-400'
    },
    {
      icon: Droplets,
      label: 'Umiditate',
      value: `${data.humidity.toFixed(0)}%`,
      subtitle: 'Relativă',
      color: 'text-cyan-400'
    },
    {
      icon: Gauge,
      label: 'Presiune',
      value: `${data.pressure.toFixed(0)} hPa`,
      subtitle: 'Atmosferică',
      color: 'text-purple-400'
    },
    {
      icon: Eye,
      label: 'Vizibilitate',
      value: `${data.visibility.toFixed(1)} km`,
      subtitle: 'Orizontală',
      color: 'text-gray-400'
    }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌤️ Condiții Actuale
        </CardTitle>
        <CardDescription>
          {data.description} • Actualizat la {new Date(data.timestamp * 1000).toLocaleTimeString('ro-RO')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {conditions.map((condition, index) => {
            const Icon = condition.icon
            return (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg glass-effect">
                <div className={`p-2 rounded-lg bg-white/5 ${condition.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">
                    {condition.label}
                  </p>
                  <p className={`text-lg font-bold ${condition.color}`}>
                    {condition.value}
                  </p>
                  {condition.subtitle && (
                    <p className="text-xs text-muted-foreground">
                      {condition.subtitle}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-6 p-4 rounded-lg glass-effect">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Nivel de Risc
              </p>
              <p className={`text-2xl font-bold ${riskColor}`}>
                {risk === 'low' ? 'SCĂZUT' : risk === 'medium' ? 'MODERAT' : 'ÎNALT'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Pragul tău: {formatWindSpeed(threshold)}
              </p>
              <p className="text-sm text-muted-foreground">
                Vânt actual: {formatWindSpeed(data.windSpeed)}
              </p>
            </div>
          </div>
        </div>
        
        {data.provider === 'combined' && (
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-400 flex items-center gap-2">
              📊 Date combinate din multiple surse meteorologice
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

