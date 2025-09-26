// Script pentru generarea cheilor VAPID necesare pentru Web Push API
// Rulează cu: node generate-vapid-keys.js

const webpush = require('web-push');

// Generează chei VAPID
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID Keys pentru Notificări Push:');
console.log('==================================');
console.log('\nPublic Key (pentru frontend):');
console.log(vapidKeys.publicKey);
console.log('\nPrivate Key (pentru server/netlify):');
console.log(vapidKeys.privateKey);
console.log('\n==================================');
console.log('Adaugă aceste chei ca variabile de mediu în Netlify:');
console.log('VAPID_PUBLIC_KEY - Cheia publică de mai sus');
console.log('VAPID_PRIVATE_KEY - Cheia privată de mai sus');
console.log('\nÎn index.html, înlocuiește "your-vapid-key-here" cu cheia publică.');
console.log('\n==================================');