import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';
import type { ButtonLayout } from '~/components/FooterTabBar';
import type { HeaderLayout } from '~/components/NowHeader';
import { useWalkthroughCompleted } from './useWalkthroughCompleted';

type Layout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const useSelectLineWalkthrough = () => {
  const {
    isWalkthroughActive,
    currentStepIndex,
    currentStepId,
    currentStep,
    totalSteps,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  } = useWalkthroughCompleted();

  const [settingsButtonLayout, setSettingsButtonLayout] =
    useState<ButtonLayout | null>(null);
  const [nowHeaderLayout, setNowHeaderLayout] = useState<HeaderLayout | null>(
    null
  );
  const [lineListLayout, setLineListLayout] = useState<Layout | null>(null);
  const [presetsLayout, setPresetsLayout] = useState<Layout | null>(null);
  const lineListRef = useRef<View>(null);
  const presetsRef = useRef<View>(null);

  // NowHeader をハイライト
  useEffect(() => {
    if (currentStepId === 'changeLocation' && nowHeaderLayout) {
      setSpotlightArea({
        x: nowHeaderLayout.x,
        y: nowHeaderLayout.y,
        width: nowHeaderLayout.width,
        height: nowHeaderLayout.height,
        borderRadius: 16,
      });
    }
  }, [currentStepId, nowHeaderLayout, setSpotlightArea]);

  // 路線一覧をハイライト
  useEffect(() => {
    if (currentStepId === 'selectLine' && lineListLayout) {
      setSpotlightArea({
        x: lineListLayout.x,
        y: lineListLayout.y,
        width: lineListLayout.width,
        height: lineListLayout.height,
        borderRadius: 12,
      });
    }
  }, [currentStepId, lineListLayout, setSpotlightArea]);

  // プリセットエリアをハイライト（marginTop: -16 を補正）
  useEffect(() => {
    if (currentStepId === 'savedRoutes' && presetsLayout) {
      setSpotlightArea({
        x: presetsLayout.x,
        y: presetsLayout.y - 16,
        width: presetsLayout.width,
        height: presetsLayout.height,
        borderRadius: 12,
      });
    }
  }, [currentStepId, presetsLayout, setSpotlightArea]);

  // 設定ボタンをハイライト
  useEffect(() => {
    if (currentStepId === 'customize' && settingsButtonLayout) {
      setSpotlightArea({
        x: settingsButtonLayout.x,
        y: settingsButtonLayout.y,
        width: settingsButtonLayout.width,
        height: settingsButtonLayout.height,
        borderRadius: 24,
      });
    }
  }, [currentStepId, settingsButtonLayout, setSpotlightArea]);

  const handlePresetsLayout = useCallback(() => {
    if (presetsRef.current) {
      presetsRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setPresetsLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  const handleLineListLayout = useCallback(() => {
    if (lineListRef.current) {
      lineListRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setLineListLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  return {
    isWalkthroughActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSettingsButtonLayout,
    setNowHeaderLayout,
    lineListRef,
    presetsRef,
    handlePresetsLayout,
    handleLineListLayout,
  };
};
