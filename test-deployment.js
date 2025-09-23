// Test pentru a verifica dacă logica de throttling e deployed
const testData = {
  windSpeed: 40,
  windGust: 48,
  windDirection: 225,
  location: "Aleea Someșul Cald, București",
  alertLevel: "danger", // Timpul cel mai scurt - 10 minute
  userThreshold: 25,
  userId: "real_production_user_" + Date.now()
};

console.log("🔍 VERIFICARE DEPLOYMENT THROTTLING");
console.log("===================================\n");
console.log("📊 Test Data:", JSON.stringify(testData, null, 2));

fetch('https://wind.qub3.uk/api/send-alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData),
})
.then(response => {
  console.log("📡 Response Status:", response.status, response.statusText);
  return response.json();
})
.then(data => {
  console.log("📥 Full Response:", JSON.stringify(data, null, 2));
  
  if (data.ok && data.data && data.data.aiMessage) {
    console.log("\n✅ Funcția merge, să fac al doilea apel imediat...");
    
    // Al doilea apel imediat (ar trebui să fie blocat)
    return fetch('https://wind.qub3.uk/api/send-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });
  } else {
    console.log("❌ Prima cerere a eșuat");
    return null;
  }
})
.then(response2 => {
  if (!response2) return;
  
  console.log("\n🔥 AL DOILEA APEL:");
  console.log("📡 Response 2 Status:", response2.status, response2.statusText);
  
  return response2.json();
})
.then(data2 => {
  if (!data2) return;
  
  console.log("📥 Response 2 Data:", JSON.stringify(data2, null, 2));
  
  if (data2.success === false && data2.error === 'Alert throttled - prea multe alerte') {
    console.log("\n🎉 THROTTLING FUNCȚIONEAZĂ!");
    console.log("⏰ Trebuie să aștepți:", data2.reason);
  } else if (data2.ok) {
    console.log("\n⚠️ PROBLEMA: Al doilea apel a trecut prin throttling!");
    console.log("Motivele posibile:");
    console.log("1. Netlify Functions sunt stateless (memoria se pierde)");
    console.log("2. Deployment-ul nu s-a făcut încă");
    console.log("3. Logica de throttling are bug");
  } else {
    console.log("\n❓ Al doilea apel a eșuat din alt motiv:", data2.error);
  }
})
.catch(error => {
  console.error("❌ Error:", error.message);
});