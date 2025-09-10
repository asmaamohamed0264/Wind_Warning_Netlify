// Test script pentru a vedea mesajele AI generate
const testCases = [
  {
    name: "Test 1 - Prag sensibil (15 km/h)",
    data: {
      windSpeed: 25,
      windGust: 30,
      windDirection: 180,
      location: "Aleea Someșul Cald, București",
      alertLevel: "warning",
      userThreshold: 15,
      userId: "test_sensitive"
    }
  },
  {
    name: "Test 2 - Prag moderat (25 km/h)",
    data: {
      windSpeed: 25,
      windGust: 30,
      windDirection: 180,
      location: "Aleea Someșul Cald, București",
      alertLevel: "caution",
      userThreshold: 25,
      userId: "test_moderate"
    }
  },
  {
    name: "Test 3 - Prag riguros (35 km/h)",
    data: {
      windSpeed: 25,
      windGust: 30,
      windDirection: 180,
      location: "Aleea Someșul Cald, București",
      alertLevel: "normal",
      userThreshold: 35,
      userId: "test_strict"
    }
  }
];

async function testAIMessages() {
  console.log("🤖 Testing AI Message Generation...\n");
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`Wind Speed: ${testCase.data.windSpeed} km/h`);
    console.log(`User Threshold: ${testCase.data.userThreshold} km/h`);
    console.log(`Alert Level: ${testCase.data.alertLevel}`);
    
    try {
      const response = await fetch('https://wind.qub3.uk/api/send-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const result = await response.json();
      
      if (result.ok) {
        console.log(`✅ Success!`);
        console.log(`📱 Push Title: ${result.data.templates.push.headings.en}`);
        console.log(`🤖 AI Message: ${result.data.aiMessage}`);
        console.log(`📧 Email Length: ${result.data.templates.email.length} chars`);
        console.log(`📱 SMS: ${result.data.templates.sms}`);
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    // Pauză între teste
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Rulează testele
testAIMessages();
