// Test simplu pentru funcția generateAiMessage
const testData = {
  windSpeed: 25,
  windGust: 30,
  windDirection: 180,
  location: "Aleea Someșul Cald, București",
  alertLevel: "warning",
  userThreshold: 20,
  userId: "test_user",
  forecast: []
};

console.log("🧪 Testing AI Message Generation...");
console.log("Test Data:", testData);

// Simulează apelul către funcția noastră
fetch('https://wind.qub3.uk/api/send-alerts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
.then(response => response.json())
.then(data => {
  console.log("📥 Full Response:", data);
  
  if (data.ok && data.data) {
    console.log("✅ Success!");
    console.log("🤖 AI Message:", data.data.aiMessage);
    console.log("📱 Push Template:", data.data.templates?.push);
    console.log("📧 Email Template Length:", data.data.templates?.email?.length);
    console.log("📱 SMS Template:", data.data.templates?.sms);
  } else {
    console.log("❌ Error or no AI data:", data);
  }
})
.catch(error => {
  console.error("❌ Network Error:", error);
});
