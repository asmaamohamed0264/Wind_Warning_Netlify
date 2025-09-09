"use client"

import { useState, useEffect } from 'react'
import { WindChart } from '@/components/wind-chart'
import { CurrentConditions } from '@/components/current-conditions'
import { NotificationSettings } from '@/components/notification-settings'
import { AlertBanner } from '@/components/alert-banner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Settings, Wind } from 'lucide-react'

interface WeatherData {
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

interface ForecastData {
  time: string
  windSpeed: number
  windGust: number
  threshold: number
}

export default function HomePage() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [settings, setSettings] = useState({
    email: '',
    phone: '',
    threshold: 50,
    channels: ['in-app'] as ('email' | 'sms' | 'push' | 'in-app')[]
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const { toast } = useToast()

  const location = "Aleea Someșul Cald, București"

  // Load weather data
  const loadWeatherData = async () => {
    try {
      const response = await fetch('/api/weather')
      if (response.ok) {
        const data = await response.json()
        setWeatherData(data.current)
        setForecastData(data.forecast)
      } else {
        throw new Error('Failed to load weather data')
      }
    } catch (error) {
      console.error('Error loading weather data:', error)
      toast({
        title: "Eroare la încărcare",
        description: "Nu am putut încărca datele meteo. Încearcă din nou.",
        variant: "destructive",
      })
    }
  }

  // Load user settings
  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  // Save user settings
  const handleSettingsChange = async (newSettings: typeof settings) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSettings(newSettings)
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadWeatherData(),
        loadSettings()
      ])
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(loadWeatherData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Wind className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Se încarcă datele meteo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                🌪️ Monitor Vânt
              </h1>
              <p className="text-muted-foreground mt-1">{location}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadWeatherData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizează
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Setări
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Alert Banner */}
          {weatherData && (
            <AlertBanner
              windSpeed={weatherData.windSpeed}
              threshold={settings.threshold}
              location={location}
            />
          )}

          {/* Current Conditions */}
          {weatherData && (
            <CurrentConditions
              data={weatherData}
              threshold={settings.threshold}
            />
          )}

          {/* Wind Chart */}
          {forecastData.length > 0 && (
            <WindChart
              data={forecastData.map(item => ({
                ...item,
                threshold: settings.threshold
              }))}
              threshold={settings.threshold}
            />
          )}

          {/* Settings Panel */}
          {showSettings && (
            <NotificationSettings
              initialSettings={settings}
              onSettingsChange={handleSettingsChange}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-2">🌍 Date Meteo</p>
              <p>Furnizate de servicii meteorologice profesionale</p>
              <p>Actualizări la fiecare 5 minute</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">🏛️ Construit pentru</p>
              <p>Siguranța și liniștea sufletească</p>
              <p>în zona Grand Arena, București</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">⚡ Powered by</p>
              <p>Bogdan pentru Loredana</p>
              <p>Urgențe: 112 • ANM: meteoromania.ro</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}