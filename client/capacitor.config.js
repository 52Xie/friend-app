const config = {
  appId: 'com.friendapp.app',
  appName: 'Friend App',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#2563eb',
    }
  }
};
module.exports = config;
