'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Wind, Settings, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AlertThresholdSettingsProps {
  onThresholdChange?: (threshold: number) => void;
}

export function AlertThresholdSettings({ onThresholdChange }: AlertThresholdSettingsProps) {
  const [threshold, setThreshold] = useState(20);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Încarcă pragul salvat din localStorage
    const savedThreshold = localStorage.getItem('wind_alert_threshold');
    if (savedThreshold) {
      setThreshold(Number(savedThreshold));
    }
  }, []);

  const handleThresholdChange = (value: number[]) => {
    const newThreshold = value[0];
    setThreshold(newThreshold);
    
    // Salvează în localStorage
    localStorage.setItem('wind_alert_threshold', newThreshold.toString());
    
    // Notifică componenta părinte
    if (onThresholdChange) {
      onThresholdChange(newThreshold);
    }
  };

  const saveThreshold = async () => {
    setIsLoading(true);
    
    try {
      // Aici poți adăuga logica pentru salvarea pe server dacă este necesar
      // Pentru moment, salvăm doar local
      localStorage.setItem('wind_alert_threshold', threshold.toString());
      
      toast.success(`Pragul de alertă a fost setat la ${threshold} km/h`);
      
      if (onThresholdChange) {
        onThresholdChange(threshold);
      }
    } catch (error) {
      console.error('Error saving threshold:', error);
      toast.error('Eroare la salvarea pragului de alertă');
    } finally {
      setIsLoading(false);
    }
  };

  const getAlertLevel = (threshold: number) => {
    if (threshold <= 15) return { level: 'Sensibil', color: 'text-green-400', emoji: '🟢' };
    if (threshold <= 25) return { level: 'Moderat', color: 'text-yellow-400', emoji: '🟡' };
    if (threshold <= 35) return { level: 'Riguros', color: 'text-orange-400', emoji: '🟠' };
    return { level: 'Foarte Riguros', color: 'text-red-400', emoji: '🔴' };
  };

  const alertInfo = getAlertLevel(threshold);

  return (
    <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <img src="/1000088934-modified.png" alt="Setări" className="mr-2 h-5 w-5" />
          Prag de Alertă Personalizat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Explicație */}
        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            Setează viteza vântului la care vrei să primești alerte personalizate.
          </p>
          <p className="text-xs text-gray-400">
            Cu cât pragul este mai mic, cu atât vei primi alerte mai des.
          </p>
        </div>

        {/* Slider pentru prag */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-white">
              Prag de Alertă: {threshold} km/h
            </Label>
            <div className={`text-sm font-medium ${alertInfo.color} flex items-center`}>
              <span className="mr-1">{alertInfo.emoji}</span>
              {alertInfo.level}
            </div>
          </div>
          
          <div className="px-2">
            <Slider
              value={[threshold]}
              onValueChange={handleThresholdChange}
              max={50}
              min={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>5 km/h</span>
              <span>50 km/h</span>
            </div>
          </div>
        </div>

        {/* Informații despre praguri */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 text-blue-400" />
            Ghid Praguri de Alertă
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700/50 p-2 rounded">
              <div className="text-green-400 font-medium">5-15 km/h</div>
              <div className="text-gray-300">Sensibil - Alerte frecvente</div>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <div className="text-yellow-400 font-medium">16-25 km/h</div>
              <div className="text-gray-300">Moderat - Alerte normale</div>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <div className="text-orange-400 font-medium">26-35 km/h</div>
              <div className="text-gray-300">Riguros - Alerte rare</div>
            </div>
            <div className="bg-gray-700/50 p-2 rounded">
              <div className="text-red-400 font-medium">36+ km/h</div>
              <div className="text-gray-300">Foarte Riguros - Doar vânturi puternice</div>
            </div>
          </div>
        </div>

        {/* Buton de salvare */}
        <Button
          onClick={saveThreshold}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Se salvează...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Salvează Pragul de Alertă
            </>
          )}
        </Button>

        {/* Info suplimentar */}
        <div className="space-y-2 border-t border-gray-700 pt-4">
          <div className="flex items-center text-xs text-blue-400">
            <Wind className="h-3 w-3 mr-1" />
            Pragul curent: {threshold} km/h
          </div>
          <p className="text-xs text-gray-500">
            Alertele vor fi personalizate cu AI în funcție de pragul tău și condițiile meteo.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
