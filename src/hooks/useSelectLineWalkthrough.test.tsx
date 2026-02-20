import { act, renderHook } from '@testing-library/react-native';
import { useSelectLineWalkthrough } from './useSelectLineWalkthrough';
import { useWalkthroughCompleted } from './useWalkthroughCompleted';

jest.mock('./useWalkthroughCompleted');

const mockSetSpotlightArea = jest.fn();
const mockNextStep = jest.fn();
const mockGoToStep = jest.fn();
const mockSkipWalkthrough = jest.fn();

const createMockWalkthrough = (
  overrides: Partial<ReturnType<typeof useWalkthroughCompleted>> = {}
): ReturnType<typeof useWalkthroughCompleted> => ({
  isWalkthroughCompleted: false,
  isWalkthroughActive: true,
  currentStepIndex: 0,
  currentStepId: 'welcome',
  currentStep: {
    id: 'welcome',
    titleKey: 'walkthroughTitle1',
    descriptionKey: 'walkthroughDescription1',
    tooltipPosition: 'bottom',
  },
  totalSteps: 5,
  nextStep: mockNextStep,
  goToStep: mockGoToStep,
  skipWalkthrough: mockSkipWalkthrough,
  setSpotlightArea: mockSetSpotlightArea,
  ...overrides,
});

describe('useSelectLineWalkthrough', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useWalkthroughCompleted as jest.Mock).mockReturnValue(
      createMockWalkthrough()
    );
  });

  it('useWalkthroughCompleted の値をそのまま返す', () => {
    const { result } = renderHook(() => useSelectLineWalkthrough());

    expect(result.current.isWalkthroughActive).toBe(true);
    expect(result.current.totalSteps).toBe(5);
    expect(result.current.currentStepIndex).toBe(0);
  });

  it('changeLocation ステップで nowHeaderLayout が設定されるとスポットライトが設定される', () => {
    (useWalkthroughCompleted as jest.Mock).mockReturnValue(
      createMockWalkthrough({ currentStepId: 'changeLocation' })
    );

    const { result } = renderHook(() => useSelectLineWalkthrough());

    act(() => {
      result.current.setNowHeaderLayout({
        x: 10,
        y: 20,
        width: 300,
        height: 50,
      });
    });

    expect(mockSetSpotlightArea).toHaveBeenCalledWith({
      x: 10,
      y: 20,
      width: 300,
      height: 50,
      borderRadius: 16,
    });
  });

  it('customize ステップで settingsButtonLayout が設定されるとスポットライトが設定される', () => {
    (useWalkthroughCompleted as jest.Mock).mockReturnValue(
      createMockWalkthrough({ currentStepId: 'customize' })
    );

    const { result } = renderHook(() => useSelectLineWalkthrough());

    act(() => {
      result.current.setSettingsButtonLayout({
        x: 50,
        y: 700,
        width: 48,
        height: 48,
      });
    });

    expect(mockSetSpotlightArea).toHaveBeenCalledWith({
      x: 50,
      y: 700,
      width: 48,
      height: 48,
      borderRadius: 24,
    });
  });

  it('nextStep / goToStep / skipWalkthrough を透過的に公開する', () => {
    const { result } = renderHook(() => useSelectLineWalkthrough());

    result.current.nextStep();
    expect(mockNextStep).toHaveBeenCalled();

    result.current.goToStep(2);
    expect(mockGoToStep).toHaveBeenCalledWith(2);

    result.current.skipWalkthrough();
    expect(mockSkipWalkthrough).toHaveBeenCalled();
  });

  it('ref が公開されている', () => {
    const { result } = renderHook(() => useSelectLineWalkthrough());

    expect(result.current.lineListRef).toBeDefined();
    expect(result.current.presetsRef).toBeDefined();
  });
});
