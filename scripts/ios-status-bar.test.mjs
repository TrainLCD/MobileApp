import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import config from '../app.config.ts';

for (const path of [
  'TrainLCD/Schemes/Dev/Info.plist',
  'TrainLCD/Schemes/Prod/Info.plist',
  'CanaryAppClip/Info.plist',
  'ProdAppClip/Info.plist',
]) {
  test(`${path} hides the status bar at launch and lets screens control it`, () => {
    const plist = readFileSync(new URL(`../ios/${path}`, import.meta.url), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '');
    for (const key of ['UIStatusBarHidden', 'UIViewControllerBasedStatusBarAppearance']) {
      assert.match(plist, new RegExp(`<key>${key}</key>\\s*<true\\s*/>`));
      assert.equal(config.ios.infoPlist[key], true);
    }
  });
}
