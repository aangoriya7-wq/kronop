const OneSignal = require('onesignal-node');

const appId = (process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '').trim();
const apiKey = (process.env.ONESIGNAL_REST_API_KEY || '').trim();

if (!appId || !apiKey) {
  module.exports = {};
} else {
  const client = new OneSignal.Client(appId, apiKey);
  module.exports = client;
}
