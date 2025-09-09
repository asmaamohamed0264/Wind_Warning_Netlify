"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import { Mail, MessageSquare, Bell, Smartphone } from 'lucide-react'

interface NotificationSettingsProps {
  initialSettings: {
    email: string
    phone: string
    threshold: number
    channels: ('email' | 'sms' | 'push' | 'in-app')[]
  }
  onSettingsChange: (settings: any) => void
  className?: string
}

export function NotificationSettings({ 
  initialSettings, 
  onSettingsChange, 
  className 
}: NotificationSettingsProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleChannelToggle = (channel: 'email' | 'sms' | 'push' | 'in-app') => {
    const newChannels = settings.channels.includes(channel)
      ? settings.channels.filter(c => c !== channel)
      : [...settings.channels, channel]
    
    setSettings(prev => ({ ...prev, channels: newChannels }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSettingsChange(settings)
      toast({
        title: "Setări salvate! ✅",
        description: "Preferințele tale au fost actualizate cu succes.",
      })
    } catch (error) {
      toast({
        title: "Eroare la salvare ❌",
        description: "Nu am putut salva setările. Încearcă din nou.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const channelConfigs = [
    {
      key: 'email' as const,
      icon: Mail,
      label: 'Email',
      description: 'Primești alerte prin email',
      placeholder: 'exemplu@email.com'
    },
    {
      key: 'sms' as const,
      icon: MessageSquare,
      label: 'SMS',
      description: 'Primești alerte prin SMS',
      placeholder: '+40712345678'
    },
    {
      key: 'push' as const,
      icon: Bell,
      label: 'Push Notifications',
      description: 'Primești notificări în browser',
      placeholder: ''
    },
    {
      key: 'in-app' as const,
      icon: Smartphone,
      label: 'In-App',
      description: 'Vezi alertele în aplicație',
      placeholder: ''
    }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ⚙️ Setări Notificări
        </CardTitle>
        <CardDescription>
          Configurează cum vrei să primești alertele de vânt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Threshold Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="threshold" className="text-base font-medium">
              Prag Alertă Vânt
            </Label>
            <span className="text-2xl font-bold text-blue-400">
              {settings.threshold} km/h
            </span>
          </div>
          <Slider
            id="threshold"
            min={0}
            max={100}
            step={5}
            value={[settings.threshold]}
            onValueChange={(value) => setSettings(prev => ({ ...prev, threshold: value[0] }))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0 km/h</span>
            <span>100 km/h</span>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Canale de Notificare</h3>
          
          {channelConfigs.map((config) => {
            const Icon = config.icon
            const isEnabled = settings.channels.includes(config.key)
            
            return (
              <div key={config.key} className="flex items-center justify-between p-4 rounded-lg glass-effect">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {config.key === 'email' && (
                    <Input
                      type="email"
                      placeholder={config.placeholder}
                      value={settings.email}
                      onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="w-48"
                      disabled={!isEnabled}
                    />
                  )}
                  {config.key === 'sms' && (
                    <Input
                      type="tel"
                      placeholder={config.placeholder}
                      value={settings.phone}
                      onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-48"
                      disabled={!isEnabled}
                    />
                  )}
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleChannelToggle(config.key)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="wind-gradient text-white hover:opacity-90"
          >
            {isLoading ? 'Se salvează...' : 'Salvează Setările'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

