import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '~/constants';
import { storage } from '~/lib/storage';

const readShouldShow = (): boolean => {
  try {
    // 路線選択画面のウォークスルーを終えていて、振り返りタブの案内をまだ見ていないユーザーだけ。
    // ウォークスルーが未完了のユーザーには、ウォークスルーの中で振り返りタブを案内する
    return (
      storage.getString(STORAGE_KEYS.WALKTHROUGH_COMPLETED) === 'true' &&
      storage.getString(STORAGE_KEYS.RIDE_REVIEW_TAB_INTRO_COMPLETED) !== 'true'
    );
  } catch (error) {
    console.error('Failed to read ride review tab intro status:', error);
    return false;
  }
};

/**
 * 振り返りタブの案内(#7118)。振り返りタブを足す前に路線選択画面のウォークスルーを
 * 終えたユーザーに、振り返りタブのステップだけを1回出す。
 *
 * 表示するかどうかはマウント時に決める。同じ画面でウォークスルーを終えたユーザーには、
 * ウォークスルーの完了時に案内も済んだことにするので(useWalkthroughCompleted)、出ない。
 */
export const useRideReviewTabIntro = () => {
  const [isVisible, setIsVisible] = useState(readShouldShow);

  const complete = useCallback(() => {
    setIsVisible(false);
    try {
      storage.set(STORAGE_KEYS.RIDE_REVIEW_TAB_INTRO_COMPLETED, 'true');
    } catch (error) {
      // 保存に失敗しても表示は閉じる。次に起動したときにもう一度出るだけ
      console.error('Failed to save ride review tab intro status:', error);
    }
  }, []);

  return { isVisible, complete };
};
