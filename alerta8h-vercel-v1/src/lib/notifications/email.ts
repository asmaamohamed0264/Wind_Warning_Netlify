import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailNotificationData {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmailNotification(data: EmailNotificationData): Promise<boolean> {
  try {
    const result = await resend.emails.send({
      from: `Monitor Vânt <noreply@${process.env.RESEND_EMAIL_DOMAIN}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text
    })

    return !!result.data?.id
  } catch (error) {
    console.error('Email send error:', error)
    return false
  }
}

export function generateEmailContent(
  windSpeed: number,
  threshold: number,
  location: string,
  aiMessage?: string
): EmailNotificationData {
  const subject = `🌪️ Alertă Vânt - ${location}`
  const isHighRisk = windSpeed >= threshold
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alertă Vânt</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${isHighRisk ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .alert-box { background: ${isHighRisk ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${isHighRisk ? '#fecaca' : '#fed7aa'}; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: ${isHighRisk ? '#dc2626' : '#f59e0b'}; }
        .stat-label { font-size: 14px; color: #6b7280; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .unsubscribe { color: #6b7280; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌪️ Alertă Vânt</h1>
          <p>${location}</p>
        </div>
        
        <div class="content">
          <div class="alert-box">
            <h2>${isHighRisk ? '⚠️ Atenție!' : '📢 Informare'}</h2>
            <p><strong>Viteza vântului:</strong> ${windSpeed.toFixed(1)} km/h</p>
            <p><strong>Pragul tău:</strong> ${threshold} km/h</p>
            ${aiMessage ? `<p><em>"${aiMessage}"</em></p>` : ''}
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${windSpeed.toFixed(1)}</div>
              <div class="stat-label">km/h</div>
            </div>
            <div class="stat">
              <div class="stat-value">${threshold}</div>
              <div class="stat-label">Prag</div>
            </div>
            <div class="stat">
              <div class="stat-value">${isHighRisk ? 'ROȘU' : 'GALBEN'}</div>
              <div class="stat-label">Risc</div>
            </div>
          </div>
          
          <p><strong>Recomandări:</strong></p>
          <ul>
            ${isHighRisk ? `
              <li>Evitați deplasările în afara casei</li>
              <li>Verificați fixarea obiectelor din curte</li>
              <li>Păstrați copiii în siguranță</li>
            ` : `
              <li>Fiți atenți la condițiile meteo</li>
              <li>Verificați prognoza înainte de a ieși</li>
            `}
          </ul>
          
          <div class="footer">
            <p>🌍 Date furnizate de servicii meteorologice • Actualizări la fiecare 5 minute</p>
            <p>🏛️ Construit pentru siguranța și liniștea sufletească în zona Grand Arena, București</p>
            <p>⚡ Powered by Bogdan pentru Loredana</p>
            <p>Urgențe: 112 • Pentru avertizări meteorologice severe vizitează <a href="https://www.meteoromania.ro">ANM</a></p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" class="unsubscribe">Dezabonează-te</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Alertă Vânt - ${location}

${isHighRisk ? '⚠️ ATENȚIE!' : '📢 Informare'}

Viteza vântului: ${windSpeed.toFixed(1)} km/h
Pragul tău: ${threshold} km/h

${aiMessage ? `"${aiMessage}"` : ''}

Recomandări:
${isHighRisk ? `
- Evitați deplasările în afara casei
- Verificați fixarea obiectelor din curte
- Păstrați copiii în siguranță
` : `
- Fiți atenți la condițiile meteo
- Verificați prognoza înainte de a ieși
`}

---
🌍 Date furnizate de servicii meteorologice • Actualizări la fiecare 5 minute
🏛️ Construit pentru siguranța și liniștea sufletească în zona Grand Arena, București
⚡ Powered by Bogdan pentru Loredana
Urgențe: 112 • Pentru avertizări meteorologice severe vizitează ANM

Dezabonează-te: ${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe
  `

  return {
    to: '',
    subject,
    html,
    text
  }
}

