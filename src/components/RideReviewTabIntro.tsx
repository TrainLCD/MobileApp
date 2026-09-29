import { StackActions, useNavigation } from '@react-navigation/native';
import type React from 'react';
import { useCallback, useMemo } from 'react';
import type { ButtonLayout } from '~/components/FooterTabBar';
import WalkthroughOverlay, {
  type WalkthroughStep,
} from '~/components/WalkthroughOverlay';
import { useRideReviewTabIntro } from '~/hooks/useRideReviewTabIntro';
import { translate } from '~/translation';

// 1ステップだけなのでドットは出ず、ステップを移ることもない
const noop = () => {};

type Props = {
  // フッターの振り返りタブのボタンの位置。測れるまでは出さない
  reviewButtonLayout: ButtonLayout | null;
  // 路線選択画面のウォークスルーが出ているあいだは重ねない
  disabled: boolean;
};

/**
 * 振り返りタブを足す前に路線選択画面のウォークスルーを終えたユーザーに、
 * 振り返りタブのステップだけを1回出す(#7118)。
 * 主ボタンで振り返りタブへ移り、「閉じる」かその外側をタップすると閉じる。
 */
export const RideReviewTabIntro: React.FC<Props> = ({
  reviewButtonLayout,
  disabled,
}) => {
  const navigation = useNavigation();
  const { isVisible, complete } = useRideReviewTabIntro();

  const step = useMemo<WalkthroughStep | null>(
    () =>
      reviewButtonLayout
        ? {
            id: 'rideReview',
            titleKey: 'walkthroughTitleRideReview',
            descriptionKey: 'walkthroughDescriptionRideReview',
            tooltipPosition: 'top',
            spotlightArea: { ...reviewButtonLayout, borderRadius: 24 },
          }
        : null,
    [reviewButtonLayout]
  );

  const handleOpen = useCallback(() => {
    complete();
    // フッターのタブと同じく、履歴を積まないよう replace で移る
    navigation.dispatch(StackActions.replace('RideReview'));
  }, [complete, navigation]);

  if (!step || !isVisible || disabled) {
    return null;
  }

  return (
    <WalkthroughOverlay
      visible
      step={step}
      currentStepIndex={0}
      totalSteps={1}
      onNext={handleOpen}
      onGoToStep={noop}
      onSkip={complete}
      onBackgroundPress={complete}
      primaryLabel={translate('rideReviewTabIntroOpen')}
      dismissLabel={translate('close')}
    />
  );
};
