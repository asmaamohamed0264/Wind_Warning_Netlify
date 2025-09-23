// Debug test vs non-test requests
console.log("🔍 DEBUG THROTTLING");
console.log("===================\n");

// Test request (ar trebui să bypasse throttling)
const testData = {
  windSpeed: 33,
  windGust: 39,
  windDirection: 90,
  location: "Aleea Someșul Cald, București", 
  alertLevel: "warning",
  userThreshold: 25,
  userId: "test_throttling_" + Date.now() // Conține 'test'
};

console.log("🧪 Test Request (should bypass throttling):");
console.log("UserId:", testData.userId);
console.log("Should bypass:", testData.userId.includes('test'));

fetch('https://wind.qub3.uk/api/send-alerts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData),
})
.then(response => response.json())  
.then(data => {
  if (data.ok) {
    console.log("✅ Test request SUCCESS (expected)");
    console.log("🤖 AI Message:", data.data.aiMessage.substring(0, 50) + "...");
  } else {
    console.log("❌ Test request FAILED:", data.error);
  }
  
  console.log("\n" + "=".repeat(50) + "\n");
  
  // Non-test request
  const realData = {
    ...testData,
    userId: "real_user_" + Date.now() // NU conține 'test'
  };
  
  console.log("🏢 Real Request (should be subject to throttling):");
  console.log("UserId:", realData.userId);
  console.log("Should bypass:", realData.userId.includes('test'));
  
  return fetch('https://wind.qub3.uk/api/send-alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(realData),
  });
})
.then(response => {
  console.log("📡 Real request status:", response.status);
  return response.json();
})
.then(data => {
  if (data.ok) {
    console.log("✅ Real request SUCCESS");
  } else if (data.error === 'Alert throttled - prea multe alerte') {
    console.log("🚦 Real request THROTTLED (expected)");
    console.log("Reason:", data.reason);
  } else {
    console.log("❌ Real request FAILED for other reason:", data.error);
  }
})
.catch(error => {
  console.error("❌ Error:", error.message);
});