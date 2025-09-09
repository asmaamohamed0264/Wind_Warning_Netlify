"use client"

import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Wind, Clock } from 'lucide-react'

interface AlertBannerProps {
  windSpeed: number
  threshold: number
  location: string
  aiMessage?: string
  className?: string
}

export function AlertBanner({ 
  windSpeed, 
  threshold, 
  location, 
  aiMessage, 
  className 
}: AlertBannerProps) {
  const isHighRisk = windSpeed >= threshold
  const riskLevel = windSpeed >= threshold * 1.2 ? 'high' : 'medium'
  
  if (!isHighRisk) {
    return null
  }

  return (
    <Card className={`${className} ${riskLevel === 'high' ? 'risk-high' : 'risk-medium'} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-full ${riskLevel === 'high' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
              <AlertTriangle className={`h-6 w-6 ${riskLevel === 'high' ? 'text-red-400' : 'text-yellow-400'}`} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <Wind className="h-5 w-5" />
              <h3 className="text-lg font-bold">
                {riskLevel === 'high' ? '🚨 ALERTĂ ÎNALTĂ' : '⚠️ ALERTĂ MODERATĂ'}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Locație</p>
                <p className="font-semibold">{location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vânt Actual</p>
                <p className="font-semibold text-lg">{windSpeed.toFixed(1)} km/h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pragul Tău</p>
                <p className="font-semibold">{threshold} km/h</p>
              </div>
            </div>
            
            {aiMessage && (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
                <p className="text-sm italic">&ldquo;{aiMessage}&rdquo;</p>
              </div>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Actualizat la {new Date().toLocaleTimeString('ro-RO')}</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-white/5">
              <p className="text-sm font-medium mb-2">Recomandări:</p>
              <ul className="text-sm space-y-1">
                {riskLevel === 'high' ? (
                  <>
                    <li>• Evitați deplasările în afara casei</li>
                    <li>• Verificați fixarea obiectelor din curte</li>
                    <li>• Păstrați copiii în siguranță</li>
                    <li>• Urgențe: 112</li>
                  </>
                ) : (
                  <>
                    <li>• Fiți atenți la condițiile meteo</li>
                    <li>• Verificați prognoza înainte de a ieși</li>
                    <li>• Țineți-vă bine de pălărie</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
