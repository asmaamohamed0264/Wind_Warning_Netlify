// Test script pentru a vedea mesajul AI generat
const testData = {
  windSpeed: 32,
  windGust: 38,
  windDirection: 180,
  location: "Aleea Someșul Cald, București",
  alertLevel: "danger",
  userThreshold: 20,
  userId: "test_user_123",
  forecast: [
    { time: "2025-01-09T12:00:00Z", windSpeed: 32, windGust: 38 },
    { time: "2025-01-09T13:00:00Z", windSpeed: 28, windGust: 35 },
    { time: "2025-01-09T14:00:00Z", windSpeed: 25, windGust: 30 }
  ]
};

console.log("Test data:", testData);

// Simulează apelul către API
fetch('https://wind.qub3.uk/api/send-alerts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
.then(response => response.json())
.then(data => {
  console.log("API Response:", data);
  if (data.ok && data.data.aiMessage) {
    console.log("🤖 AI Message:", data.data.aiMessage);
    console.log("📱 Push Template:", data.data.templates.push);
    console.log("📧 Email Template Length:", data.data.templates.email.length);
    console.log("📱 SMS Template:", data.data.templates.sms);
  }
})
.catch(error => {
  console.error("Error:", error);
});
