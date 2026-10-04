import { StopCondition } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { findPassedStation } from './passedStation';

// 東海道新幹線 上り(三島→新横浜)。のぞみは熱海・小田原を通過する。
const mishima = createStation(100206, {
  name: '三島',
  latitude: 35.1265,
  longitude: 138.9108,
});
const atami = createStation(100205, {
  name: '熱海',
  latitude: 35.1036,
  longitude: 139.0779,
  stopCondition: StopCondition.Not,
});
const odawara = createStation(100204, {
  name: '小田原',
  latitude: 35.2564,
  longitude: 139.1552,
  stopCondition: StopCondition.Not,
});
const shinYokohama = createStation(100203, {
  name: '新横浜',
  latitude: 35.5069,
  longitude: 139.6175,
});

const nozomi = [mishima, atami, odawara, shinYokohama];

// 診断ダンプ(2026-10-04)の測位。小田原→新横浜の間で、現在駅は三島に残っていた
const BETWEEN_ODAWARA_AND_SHIN_YOKOHAMA = {
  latitude: 35.40113,
  longitude: 139.39607,
};

describe('findPassedStation', () => {
  it('通過駅を2つ取りこぼしても、現在地の区間の始点まで進める', () => {
    const { latitude, longitude } = BETWEEN_ODAWARA_AND_SHIN_YOKOHAMA;
    expect(findPassedStation(nozomi, mishima, latitude, longitude, 7)?.id).toBe(
      odawara.id
    );
  });

  it('熱海と小田原の間なら熱海まで進める', () => {
    expect(findPassedStation(nozomi, mishima, 35.18, 139.12, 10)?.id).toBe(
      atami.id
    );
  });

  it('現在駅と次駅の間にいる間は進めない', () => {
    expect(
      findPassedStation(nozomi, mishima, 35.115, 139.0, 10)
    ).toBeUndefined();
  });

  it('通過駅の到着圏が取りうる最大半径(350m)の内側では進めない', () => {
    // 小田原から新横浜方向へ約300m
    expect(
      findPassedStation(nozomi, mishima, 35.2575, 139.1582, 5)
    ).toBeUndefined();
  });

  it('測位誤差を差し引くと到着圏に届きうる場合は進めない', () => {
    // 小田原から約1.4kmだが、精度1500mでは手前にいる可能性を否定できない
    expect(
      findPassedStation(nozomi, mishima, 35.262, 139.17, 1500)
    ).toBeUndefined();
  });

  it('停車駅は飛び越えない', () => {
    const kodama = [
      mishima,
      atami,
      { ...odawara, stopCondition: StopCondition.All },
      shinYokohama,
    ];
    const { latitude, longitude } = BETWEEN_ODAWARA_AND_SHIN_YOKOHAMA;
    expect(
      findPassedStation(kodama, mishima, latitude, longitude, 7)
    ).toBeUndefined();
  });

  it('現在駅より後方にいるときは進めない', () => {
    expect(
      findPassedStation(nozomi, mishima, 35.14, 138.85, 10)
    ).toBeUndefined();
  });

  it('現在駅が並びに無ければ何もしない', () => {
    const { latitude, longitude } = BETWEEN_ODAWARA_AND_SHIN_YOKOHAMA;
    expect(
      findPassedStation(
        nozomi,
        createStation(1, { latitude: 35, longitude: 139 }),
        latitude,
        longitude,
        7
      )
    ).toBeUndefined();
  });
});
