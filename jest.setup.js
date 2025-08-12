// This must be very early in the setup to avoid native module issues
const mockDimensions = {
  get: jest.fn(() => ({ 
    width: 375, 
    height: 667, 
    scale: 1, 
    fontScale: 1 
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Override any existing Dimensions before anything else imports it
jest.doMock('react-native/Libraries/Utilities/Dimensions', () => mockDimensions);

module.exports = { setupFiles: ['<rootDir>/jest.setup.js'] }

// Mock TurboModuleRegistry
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn(() => ({
    getConstants: jest.fn(() => ({
      Accuracy: {
        BestForNavigation: 0,
        Best: 1,
        NearestTenMeters: 2,
        Balanced: 3,
        Low: 4,
      },
    })),
  })),
  get: jest.fn(() => ({
    getConstants: jest.fn(() => ({})),
  })),
}));
