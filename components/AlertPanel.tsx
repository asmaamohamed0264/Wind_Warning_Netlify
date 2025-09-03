'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertLevel } from '@/types/alerts';
import { AlertTriangle, Wind, Clock, Shield } from 'lucide-react';

interface Alert {
  level: AlertLevel;
  maxWindSpeed: number;
  time: string;
  message: string;
}

interface AlertPanelProps {
  alert: Alert;
}

export function AlertPanel({ alert }: AlertPanelProps) {
  const getAlertStyles = (level: AlertLevel) => {
    switch (level) {
      case 'danger':
        return {
          border: 'border-red-500',
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          icon: 'text-red-400',
          pulse: 'animate-pulse'
        };
      case 'warning':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          icon: 'text-yellow-400',
          pulse: ''
        };
      case 'caution':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-500/20',
          text: 'text-orange-400',
          icon: 'text-orange-400',
          pulse: ''
        };
      default:
        return {
          border: 'border-green-500',
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          icon: 'text-green-400',
          pulse: ''
        };
    }
  };

  const styles = getAlertStyles(alert.level);
  const alertTime = new Date(alert.time);
  const timeUntil = Math.round((alertTime.getTime() - Date.now()) / (1000 * 60 * 60));

  const getAlertTitle = (level: AlertLevel) => {
    switch (level) {
      case 'danger': return '🚨 PERICOL MAJOR DE VÂNT';
      case 'warning': return '⚠️ AVERTIZARE VÂNT PUTERNIC';
      case 'caution': return '💨 ATENȚIE VÂNT MODERAT';
      default: return '✅ CONDIȚII NORMALE';
    }
  };

  const getSafetyRecommendations = (level: AlertLevel) => {
    switch (level) {
      case 'danger':
        return [
          'Rămâi în interior și evită toate activitățile în aer liber',
          'Fixează sau îndepărtează toate obiectele mobile din exterior',
          'Evită conducerea, în special a vehiculelor înalte',
          'Stai departe de ferestre și copaci'
        ];
      case 'warning':
        return [
          'Exercită precauție extremă când ieși afară',
          'Fixează obiectele mobile din curte',
          'Evită mersul pe jos lângă copaci sau structuri înalte',
          'Conduce cu atenție și fii conștient de vânturile laterale'
        ];
      case 'caution':
        return [
          'Fii atent la schimbările condițiilor de vânt',
          'Fixează obiectele ușoare din exterior',
          'Exercită precauție normală când ieși afară'
        ];
      default:
        return [];
    }
  };

  return (
    <Card className={`border-2 ${styles.border} ${styles.bg} ${styles.pulse} backdrop-blur-sm`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className={`h-8 w-8 ${styles.icon} mr-3`} />
            <div>
              <h2 className={`text-2xl font-bold ${styles.text}`}>
                {getAlertTitle(alert.level)}
              </h2>
              <p className="text-gray-300 mt-1">
                {alert.message}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center">
            <Wind className={`h-5 w-5 ${styles.icon} mr-2`} />
            <div>
              <div className={`text-xl font-bold ${styles.text}`}>
                {alert.maxWindSpeed} km/h
              </div>
              <div className="text-sm text-gray-400">Viteza Maximă a Vântului</div>
            </div>
          </div>

          <div className="flex items-center">
            <Clock className={`h-5 w-5 ${styles.icon} mr-2`} />
            <div>
              <div className={`text-xl font-bold ${styles.text}`}>
                {timeUntil > 0 ? `${timeUntil}h` : 'Now'}
              </div>
              <div className="text-sm text-gray-400">
                {timeUntil > 0 ? 'Timp până la vârf' : 'Activ în prezent'}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <Shield className={`h-5 w-5 ${styles.icon} mr-2`} />
            <div>
              <div className={`text-xl font-bold ${styles.text} uppercase`}>
                {alert.level}
              </div>
              <div className="text-sm text-gray-400">Nivel de Alertă</div>
            </div>
          </div>
        </div>

        {getSafetyRecommendations(alert.level).length > 0 && (
        {Array.isArray(getSafetyRecommendations(alert.level)) && getSafetyRecommendations(alert.level).length > 0 && (
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-400" />
              Recomandări de Siguranță
            </h3>
            <ul className="space-y-2">
              {getSafetyRecommendations(alert.level).map((recommendation, index) => (
                <li key={index} className="flex items-start text-gray-300">
                  <span className={`text-sm font-bold ${styles.text} mr-2 mt-1`}>•</span>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}