jest.mock('react-redux', () => ({
  getLocales: jest.fn(),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));
jest.mock('react-native-fs', () => ({}));
