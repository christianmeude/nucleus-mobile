module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native)'
  ],
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js'
  },
};
