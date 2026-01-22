import { createStore } from 'jotai';
import {
  initialTrainMotionState,
  motionDetectionEnabledAtom,
  motionDetectionForcedAtom,
  resetTrainMotionAtom,
  stationStopDetectedAtom,
  trainMotionAtom,
} from './trainMotion';

describe('trainMotion atoms', () => {
  describe('initialTrainMotionState', () => {
    it('初期状態が期待される値を持つ', () => {
      expect(initialTrainMotionState).toEqual({
        phase: 'unknown',
        confidence: 0,
        phaseStartTime: 0,
        lastStopTime: null,
        isEnabled: false,
        stopCount: 0,
        currentAcceleration: 0,
        currentVariance: 0,
      });
    });

    it('isEnabledがfalseで初期化される', () => {
      expect(initialTrainMotionState.isEnabled).toBe(false);
    });

    it('phaseがunknownで初期化される', () => {
      expect(initialTrainMotionState.phase).toBe('unknown');
    });
  });

  describe('trainMotionAtom', () => {
    it('初期状態でinitialTrainMotionStateを返す', () => {
      const store = createStore();
      const state = store.get(trainMotionAtom);
      expect(state).toEqual(initialTrainMotionState);
    });

    it('状態を更新できる', () => {
      const store = createStore();
      store.set(trainMotionAtom, {
        ...initialTrainMotionState,
        phase: 'stopped',
        isEnabled: true,
      });
      const state = store.get(trainMotionAtom);
      expect(state.phase).toBe('stopped');
      expect(state.isEnabled).toBe(true);
    });
  });

  describe('motionDetectionForcedAtom', () => {
    it('初期状態でfalseを返す', () => {
      const store = createStore();
      const isForced = store.get(motionDetectionForcedAtom);
      expect(isForced).toBe(false);
    });

    it('trueに設定できる', () => {
      const store = createStore();
      store.set(motionDetectionForcedAtom, true);
      const isForced = store.get(motionDetectionForcedAtom);
      expect(isForced).toBe(true);
    });

    it('falseに戻せる', () => {
      const store = createStore();
      store.set(motionDetectionForcedAtom, true);
      store.set(motionDetectionForcedAtom, false);
      const isForced = store.get(motionDetectionForcedAtom);
      expect(isForced).toBe(false);
    });
  });

  describe('motionDetectionEnabledAtom', () => {
    it('trainMotionAtomのisEnabled値を読み取る', () => {
      const store = createStore();
      const isEnabled = store.get(motionDetectionEnabledAtom);
      expect(isEnabled).toBe(false);
    });

    it('有効化するとisEnabledがtrueになる', () => {
      const store = createStore();
      store.set(motionDetectionEnabledAtom, true);
      const state = store.get(trainMotionAtom);
      expect(state.isEnabled).toBe(true);
    });

    it('無効化時に状態がリセットされる', () => {
      const store = createStore();
      // まず有効化して状態を変更
      store.set(trainMotionAtom, {
        ...initialTrainMotionState,
        isEnabled: true,
        phase: 'cruising',
        stopCount: 5,
        currentAcceleration: 0.5,
        currentVariance: 0.1,
        phaseStartTime: 12345,
        lastStopTime: 12340,
      });

      // 無効化
      store.set(motionDetectionEnabledAtom, false);
      const state = store.get(trainMotionAtom);

      expect(state.isEnabled).toBe(false);
      expect(state.phase).toBe('unknown');
      expect(state.stopCount).toBe(0);
      expect(state.currentAcceleration).toBe(0);
      expect(state.currentVariance).toBe(0);
      expect(state.phaseStartTime).toBe(0);
      expect(state.lastStopTime).toBeNull();
    });

    it('有効化時に状態がリセットされない', () => {
      const store = createStore();
      // 無効状態でも状態を設定
      store.set(trainMotionAtom, {
        ...initialTrainMotionState,
        phase: 'stopped',
        stopCount: 3,
      });

      // 有効化
      store.set(motionDetectionEnabledAtom, true);
      const state = store.get(trainMotionAtom);

      expect(state.isEnabled).toBe(true);
      expect(state.phase).toBe('stopped');
      expect(state.stopCount).toBe(3);
    });
  });

  describe('stationStopDetectedAtom', () => {
    it('初期状態で0を返す', () => {
      const store = createStore();
      const count = store.get(stationStopDetectedAtom);
      expect(count).toBe(0);
    });

    it('インクリメントできる', () => {
      const store = createStore();
      store.set(stationStopDetectedAtom, 1);
      expect(store.get(stationStopDetectedAtom)).toBe(1);
      store.set(stationStopDetectedAtom, 2);
      expect(store.get(stationStopDetectedAtom)).toBe(2);
    });
  });

  describe('resetTrainMotionAtom', () => {
    it('全ての状態を初期値にリセットする', () => {
      const store = createStore();

      // 状態を変更
      store.set(trainMotionAtom, {
        ...initialTrainMotionState,
        isEnabled: true,
        phase: 'cruising',
        stopCount: 5,
      });
      store.set(stationStopDetectedAtom, 10);

      // リセット
      store.set(resetTrainMotionAtom);

      expect(store.get(trainMotionAtom)).toEqual(initialTrainMotionState);
      expect(store.get(stationStopDetectedAtom)).toBe(0);
    });
  });
});
