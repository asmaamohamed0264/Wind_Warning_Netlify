import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
})

export async function generateAlertMessage(
  windSpeed: number,
  threshold: number,
  location: string,
  isHighRisk: boolean
): Promise<string | null> {
  try {
    const prompt = `Generează un mesaj de alertă vânt în română pentru ${location}.

Context:
- Viteza vântului: ${windSpeed.toFixed(1)} km/h
- Pragul utilizatorului: ${threshold} km/h
- Nivel de risc: ${isHighRisk ? 'ÎNALT' : 'MODERAT'}

Cerințe:
- Mesajul să fie concis (max 2-3 propoziții)
- Să fie prietenos și calm
- Să includă o glumiță ușoară despre vânt
- Să ofere o recomandare practică
- Să fie în română

Exemplu de stil: "Vântul dansează cu ${windSpeed.toFixed(1)} km/h la ${location}! 🌪️ ${isHighRisk ? 'E timpul să rămâi în casă și să te uiți la vremea prin fereastră.' : 'Poți ieși, dar ține-te bine de pălărie!'}"`

    const response = await openai.chat.completions.create({
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })

    const message = response.choices[0]?.message?.content?.trim()
    return message || null
  } catch (error) {
    console.error('AI message generation error:', error)
    return null
  }
}

export function getFallbackMessage(
  windSpeed: number,
  threshold: number,
  location: string,
  isHighRisk: boolean
): string {
  const messages = [
    `Vântul bate cu ${windSpeed.toFixed(1)} km/h la ${location}! ${isHighRisk ? 'E timpul să rămâi în casă și să te uiți la vremea prin fereastră.' : 'Poți ieși, dar ține-te bine de pălărie!'} 🌪️`,
    `Alertă vânt la ${location}: ${windSpeed.toFixed(1)} km/h! ${isHighRisk ? 'Vântul e destul de puternic să te ducă cu el - rămâi în siguranță!' : 'Vântul e moderat, dar fiți atenți la condiții.'} 💨`,
    `Vântul ${isHighRisk ? 'se întrece' : 'se joacă'} cu ${windSpeed.toFixed(1)} km/h la ${location}! ${isHighRisk ? 'E mai bine să rămâi în casă și să te uiți la vremea prin fereastră.' : 'Poți ieși, dar nu uita să te ții bine!'} 🌬️`,
    `${location} - Vânt ${windSpeed.toFixed(1)} km/h! ${isHighRisk ? 'Vântul e destul de puternic să te ducă cu el - rămâi în siguranță!' : 'Condiții moderate, dar fiți atenți la vreme.'} ⚡`
  ]
  
  // Use wind speed to determine which message to use
  const index = Math.floor(windSpeed) % messages.length
  return messages[index]
}

