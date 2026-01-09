/**
 * OneSignal MCP Helper
 * Funcții pentru a interacționa cu OneSignal prin MCP
 */

export interface OneSignalNotification {
  app_id: string;
  contents: {
    en: string;
    ro?: string;
  };
  headings: {
    en: string;
    ro?: string;
  };
  included_segments?: string[];
  filters?: Array<{
    field: string;
    key: string;
    relation: string;
    value: string;
  }>;
  data?: Record<string, any>;
  priority?: number;
  ttl?: number;
}

/**
 * Trimite o notificare de alertă vânt prin OneSignal
 */
export async function sendWindAlertNotification(
  level: 'caution' | 'warning' | 'danger',
  windSpeed: number,
  time: string
): Promise<Response> {
  const notification: OneSignalNotification = {
    app_id: process.env.ONESIGNAL_APP_ID!,
    contents: {
      en: `Wind speed: ${windSpeed} km/h expected at ${time}`,
      ro: `Viteză vânt: ${windSpeed} km/h așteptată la ${time}`,
    },
    headings: {
      en: getAlertTitle(level),
      ro: getAlertTitleRo(level),
    },
    included_segments: ['All'],
    data: {
      level,
      windSpeed,
      time,
      type: 'wind_alert',
    },
    priority: level === 'danger' ? 10 : level === 'warning' ? 7 : 5,
    ttl: 3600, // 1 hour
  };

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(notification),
  });

  return response;
}

function getAlertTitle(level: string): string {
  switch (level) {
    case 'danger':
      return '🚨 DANGER: High Wind Alert!';
    case 'warning':
      return '⚠️ WARNING: Strong Winds Expected';
    case 'caution':
      return '⚡ CAUTION: Moderate Winds';
    default:
      return 'Wind Alert';
  }
}

function getAlertTitleRo(level: string): string {
  switch (level) {
    case 'danger':
      return '🚨 PERICOL: Alertă Vânt Puternic!';
    case 'warning':
      return '⚠️ AVERTIZARE: Vânturi Puternice';
    case 'caution':
      return '⚡ ATENȚIE: Vânturi Moderate';
    default:
      return 'Alertă Vânt';
  }
}

/**
 * Creează un segment de utilizatori pentru București
 */
export async function createBucharestSegment() {
  const segment = {
    name: 'București Users',
    filters: [
      {
        field: 'location',
        radius: '50000', // 50km radius
        lat: '44.4268',
        long: '26.1025',
      },
    ],
  };

  const response = await fetch(
    `https://onesignal.com/api/v1/apps/${process.env.ONESIGNAL_APP_ID}/segments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(segment),
    }
  );

  return response;
}

/**
 * Obține statistici despre aplicație
 */
export async function getAppStats() {
  const response = await fetch(
    `https://onesignal.com/api/v1/apps/${process.env.ONESIGNAL_APP_ID}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
    }
  );

  return response.json();
}
