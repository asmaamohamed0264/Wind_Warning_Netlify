'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Settings, Wind } from 'lucide-react';
import { useState } from 'react';

interface ThresholdControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function ThresholdControl({ value, onChange }: ThresholdControlProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleSliderChange = (newValue: number[]) => {
    setLocalValue(newValue[0]);
    onChange(newValue[0]);
  };

  const getThresholdDescription = (threshold: number) => {
    if (threshold <= 30) return 'Foarte sensibil - alerte pentru vânturi ușoare';
    if (threshold <= 50) return 'Moderat - alertare echilibrată';
    if (threshold <= 70) return 'Conservator - doar vânturi puternice';
    return 'Minimal - doar vânturi extreme';
  };

  const getThresholdColor = (threshold: number) => {
    if (threshold <= 30) return 'text-blue-400';
    if (threshold <= 50) return 'text-green-400';
    if (threshold <= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <img src="/1000088934-modified.png" alt="Setări" className="mr-2 h-5 w-5" />
          Prag de Alertă
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Wind className={`h-6 w-6 mr-2 ${getThresholdColor(localValue)}`} />
            <span className={`text-3xl font-bold ${getThresholdColor(localValue)}`}>
              {localValue}
            </span>
            <span className="text-lg text-gray-400 ml-1">km/h</span>
          </div>
          <p className={`text-sm ${getThresholdColor(localValue)}`}>
            {getThresholdDescription(localValue)}
          </p>
        </div>

        <div className="space-y-4">
          <Slider
            value={[localValue]}
            onValueChange={handleSliderChange}
            max={100}
            min={20}
            step={5}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>20 km/h</span>
            <span>Ușor</span>
            <span>Moderat</span>
            <span>Puternic</span>
            <span>100 km/h</span>
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">Cum funcționează:</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            Vei primi alerte când vitezele vântului prognozate (inclusiv rafalele) 
            depășesc pragul selectat în următoarele 8 ore. Valorile mai mici 
            înseamnă alerte mai frecvente, dar timp mai bun de pregătire.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}