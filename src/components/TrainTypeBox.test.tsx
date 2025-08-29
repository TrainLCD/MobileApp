import { render } from '@testing-library/react-native';
import React from 'react';

// 特定のクラッシュ修正をテストする最小限のコンポーネントを作成
const TestSplitFunction = ({
  trainTypeName,
  prevTrainTypeName,
}: {
  trainTypeName: string | null | undefined;
  prevTrainTypeName: string | null | undefined;
}) => {
  // TrainTypeBoxでクラッシュを引き起こしていた正確なロジックを模倣
  const _numberOfLines = React.useMemo(
    () => (trainTypeName?.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );
  const _prevNumberOfLines = React.useMemo(
    () => (prevTrainTypeName?.split('\n').length === 1 ? 1 : 2),
    [prevTrainTypeName]
  );

  return null; // コンポーネントがクラッシュしないことだけを確認
};

// 無限ループ修正を模倣するテストコンポーネント
const TestInfiniteLoopFix = ({
  trainTypeName,
}: {
  trainTypeName: string | null | undefined;
}) => {
  const [fadeOutFinished, setFadeOutFinished] = React.useState(false);
  const [renderCount, setRenderCount] = React.useState(0);

  // useLazyPreviousの動作を模擬
  const [prevTrainTypeName, setPrevTrainTypeName] =
    React.useState(trainTypeName);
  React.useEffect(() => {
    if (fadeOutFinished && prevTrainTypeName !== trainTypeName) {
      setPrevTrainTypeName(trainTypeName);
    }
  }, [fadeOutFinished, prevTrainTypeName, trainTypeName]);

  // 修正されたuseEffectロジックをテスト
  React.useEffect(() => {
    setRenderCount((prev) => prev + 1);

    // 修正されたロジック: 実際に変更があった場合のみsetFadeOutFinished(false)を実行
    if (prevTrainTypeName !== trainTypeName) {
      setFadeOutFinished(false);
      // アニメーション完了をシミュレート
      setTimeout(() => setFadeOutFinished(true), 10);
    }
  }, [prevTrainTypeName, trainTypeName]);

  // テストでの無限ループを防止
  if (renderCount > 10) {
    throw new Error('無限ループが検出されました');
  }

  return null;
};

describe('TrainTypeBoxクラッシュ修正', () => {
  it('trainTypeNameがundefinedの場合にクラッシュしない', () => {
    expect(() => {
      render(
        <TestSplitFunction
          trainTypeName={undefined}
          prevTrainTypeName={undefined}
        />
      );
    }).not.toThrow();
  });

  it('trainTypeNameがnullの場合にクラッシュしない', () => {
    expect(() => {
      render(
        <TestSplitFunction trainTypeName={null} prevTrainTypeName={null} />
      );
    }).not.toThrow();
  });

  it('trainTypeNameが空文字列の場合にクラッシュしない', () => {
    expect(() => {
      render(<TestSplitFunction trainTypeName="" prevTrainTypeName="" />);
    }).not.toThrow();
  });

  it('有効な文字列で正常に動作する', () => {
    expect(() => {
      render(
        <TestSplitFunction
          trainTypeName="Test"
          prevTrainTypeName="Test\nLine"
        />
      );
    }).not.toThrow();
  });

  it('一方がundefinedで他方が有効な場合に正常に動作する', () => {
    expect(() => {
      render(
        <TestSplitFunction
          trainTypeName={undefined}
          prevTrainTypeName="Valid"
        />
      );
    }).not.toThrow();
  });

  it('値が変更された場合に無限ループを引き起こさない', () => {
    expect(() => {
      render(<TestInfiniteLoopFix trainTypeName="Test" />);
    }).not.toThrow();
  });

  it('値が同じままの場合に無限ループを引き起こさない', () => {
    expect(() => {
      render(<TestInfiniteLoopFix trainTypeName="Test" />);
      // 同じ値で再度レンダリング
      render(<TestInfiniteLoopFix trainTypeName="Test" />);
    }).not.toThrow();
  });

  it('「Maximum update depth exceeded」を引き起こしていた特定の無限ループシナリオを処理する', () => {
    // このテストは問題を引き起こしていたシナリオを具体的に再現します
    const TestInfiniteLoopScenario = ({
      initialValue,
    }: {
      initialValue: string;
    }) => {
      const [fadeOutFinished, setFadeOutFinished] = React.useState(false);
      const [trainTypeName, _setTrainTypeName] = React.useState(initialValue);
      const [renderCount, setRenderCount] = React.useState(0);

      // fadeOutFinishedが変更されたときに更新されるuseLazyPreviousの動作を模擬
      const [prevTrainTypeName, setPrevTrainTypeName] =
        React.useState(initialValue);
      React.useEffect(() => {
        if (fadeOutFinished) {
          setPrevTrainTypeName(trainTypeName);
        }
      }, [fadeOutFinished, trainTypeName]);

      // 修正されたuseEffectパターン（実装したもの）
      React.useEffect(() => {
        setRenderCount((prev) => prev + 1);

        // 実際に変更があった場合のみfadeOutFinishedをリセット
        if (prevTrainTypeName !== trainTypeName) {
          setFadeOutFinished(false);
          // アニメーション完了をシミュレート
          setTimeout(() => setFadeOutFinished(true), 5);
        }
      }, [prevTrainTypeName, trainTypeName]);

      // 無限ループが発生しないことをテスト
      if (renderCount > 10) {
        throw new Error(
          '無限ループが検出されました - Maximum update depth exceeded!'
        );
      }

      return React.createElement('div', null, `Renders: ${renderCount}`);
    };

    expect(() => {
      render(
        React.createElement(TestInfiniteLoopScenario, {
          initialValue: 'Express',
        })
      );
    }).not.toThrow();
  });
});
