const fs = require('fs');
const { exec } = require('child_process');

// NOTE: 全ての画像のサイズを105x105に変換し同名で保存
fs.readdir('.', (err, files) => {
  files.forEach((parentDir) => {
    fs.readdir(parentDir, (err2, pngFiles) => {
      // eslint-disable-next-line no-unused-expressions
      pngFiles?.forEach((pngFile) => {
        const relativePath = `${parentDir}/${pngFile}`;
        exec(
          `magick ${relativePath} -resize 105x105 ${relativePath}`,
          (execErr, stdout, stderr) => {
            if (execErr) {
              console.error('Resize failed:', stderr, relativePath);
            } else {
              console.log('Resize success:', relativePath)
            }

            // NOTE: 通過駅用に画像をグレースケールに変換し _g.png に接尾辞を変えて保存
            exec(
              `magick ${relativePath} -colorspace Gray ${relativePath.replace(
                '.png',
                ''
              )}_g.png`,
              (execErr, stdout, stderr) => {
                if (execErr) {
                  console.error("Grayscale failed:", stderr, relativePath);
                } else {
                  console.log('Grayscale success:', relativePath)
                }
              }
            );
          }
        );
      });
    });
  });
});