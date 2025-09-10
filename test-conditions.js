// Test pentru a verifica care condiție nu este îndeplinită
const testCases = [
  {
    name: "Test 1 - Toate parametrii",
    data: {
      windSpeed: 25,
      windGust: 30, 
      windDirection: 180,
      location: "Aleea Someșul Cald, București",
      alertLevel: "warning",
      userThreshold: 20,
      userId: "test1"
    }
  },
  {
    name: "Test 2 - Fără windGust",
    data: {
      windSpeed: 25,
      windDirection: 180,
      location: "Aleea Someșul Cald, București", 
      alertLevel: "warning",
      userThreshold: 20,
      userId: "test2"
    }
  },
  {
    name: "Test 3 - Minim necesar",
    data: {
      windSpeed: 25,
      location: "Aleea Someșul Cald, București",
      userThreshold: 20
    }
  }
];

console.log("🧪 Testing which condition fails...");

testCases.forEach(async (testCase, index) => {
  console.log(`\n📋 ${testCase.name}`);
  console.log("Data:", testCase.data);
  console.log("Conditions check:");
  console.log("- windSpeed !== undefined:", testCase.data.windSpeed !== undefined);
  console.log("- location truthy:", !!testCase.data.location);
  console.log("- userThreshold truthy:", !!testCase.data.userThreshold);
  console.log("- All conditions:", testCase.data.windSpeed !== undefined && !!testCase.data.location && !!testCase.data.userThreshold);
  
  try {
    const response = await fetch('https://wind.qub3.uk/api/send-alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.data),
    });

    const result = await response.json();
    console.log("Response structure:", Object.keys(result));
    console.log("Has data field:", !!result.data);
    console.log("Has aiMessage:", !!result.data?.aiMessage);
    console.log("Has templates:", !!result.data?.templates);
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
  
  // Pauză între teste
  if (index < testCases.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
});

console.log("\n✅ Test completed!");
