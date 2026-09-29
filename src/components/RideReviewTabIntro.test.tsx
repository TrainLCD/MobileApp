import { fireEvent, render } from '@testing-library/react-native';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';
import { RideReviewTabIntro } from './RideReviewTabIntro';

const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  StackActions: {
    replace: (name: string) => ({ type: 'REPLACE', payload: { name } }),
  },
}));

jest.mock('~/translation', () => ({
  translate: (key: string) => key,
}));

// 見た目は WalkthroughOverlay.test.tsx で確かめるので、ここでは渡す props とボタンだけを見る
jest.mock('./WalkthroughOverlay', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    __esModule: true,
    default: (props: {
      step: { id: string; spotlightArea?: unknown };
      totalSteps: number;
      primaryLabel?: string;
      dismissLabel?: string;
      onNext: () => void;
      onSkip: () => void;
      onBackgroundPress?: () => void;
    }) => (
      <View testID="walkthrough-overlay">
        <Text testID="step-id">{props.step.id}</Text>
        <Text testID="spotlight">
          {JSON.stringify(props.step.spotlightArea)}
        </Text>
        <Text testID="total-steps">{props.totalSteps}</Text>
        <Pressable testID="primary" onPress={props.onNext}>
          <Text>{props.primaryLabel}</Text>
        </Pressable>
        <Pressable testID="dismiss" onPress={props.onSkip}>
          <Text>{props.dismissLabel}</Text>
        </Pressable>
        <Pressable testID="background" onPress={props.onBackgroundPress} />
      </View>
    ),
  };
});

const layout = { x: 200, y: 700, width: 48, height: 48 };

describe('RideReviewTabIntro', () => {
  beforeEach(() => {
    storage.set(STORAGE_KEYS.WALKTHROUGH_COMPLETED, 'true');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('振り返りタブのボタンを切り抜き、1ステップだけの案内を出す', () => {
    const { getByTestId, getByText } = render(
      <RideReviewTabIntro reviewButtonLayout={layout} disabled={false} />
    );
    expect(getByTestId('step-id').props.children).toBe('rideReview');
    expect(JSON.parse(getByTestId('spotlight').props.children)).toEqual({
      ...layout,
      borderRadius: 24,
    });
    expect(getByTestId('total-steps').props.children).toBe(1);
    expect(getByText('rideReviewTabIntroOpen')).toBeTruthy();
    expect(getByText('close')).toBeTruthy();
  });

  it('主ボタンで振り返りタブへ移り、見終えたことを保存する', () => {
    const { getByTestId, queryByTestId } = render(
      <RideReviewTabIntro reviewButtonLayout={layout} disabled={false} />
    );
    fireEvent.press(getByTestId('primary'));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'REPLACE',
      payload: { name: 'RideReview' },
    });
    expect(
      storage.getString(STORAGE_KEYS.RIDE_REVIEW_TAB_INTRO_COMPLETED)
    ).toBe('true');
    expect(queryByTestId('walkthrough-overlay')).toBeNull();
  });

  it.each([
    ['閉じる', 'dismiss'],
    ['外側のタップ', 'background'],
  ])('%sでは移らずに閉じる', (_, testID) => {
    const { getByTestId, queryByTestId } = render(
      <RideReviewTabIntro reviewButtonLayout={layout} disabled={false} />
    );
    fireEvent.press(getByTestId(testID));
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(
      storage.getString(STORAGE_KEYS.RIDE_REVIEW_TAB_INTRO_COMPLETED)
    ).toBe('true');
    expect(queryByTestId('walkthrough-overlay')).toBeNull();
  });

  it('路線選択画面のウォークスルーが出ているあいだは重ねない', () => {
    const { queryByTestId } = render(
      <RideReviewTabIntro reviewButtonLayout={layout} disabled />
    );
    expect(queryByTestId('walkthrough-overlay')).toBeNull();
  });

  it('振り返りタブの位置を測れるまでは出さない', () => {
    const { queryByTestId } = render(
      <RideReviewTabIntro reviewButtonLayout={null} disabled={false} />
    );
    expect(queryByTestId('walkthrough-overlay')).toBeNull();
  });
});
