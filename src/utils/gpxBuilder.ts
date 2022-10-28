import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export type GPXData = {
  latitude: number;
  longitude: number;
  time: Date;
};

export const buildGPXString = (data: GPXData[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrainLCD - https://trainlcd.app" xmlns="http://www.topografix.com/GPX/1/1">
<trk>
<trkseg>
${data
  .map(
    (d) => `<trkpt lat="${d.latitude}" lon="${d.longitude}">
<time>${dayjs.utc(d.time).format()}</time>
<ele>${0}</ele>
</trkpt>`
  )
  .join('\n')}
</trkseg>
</trk>
</gpx>`.trim();
