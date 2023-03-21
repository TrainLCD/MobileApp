import { MarkShape } from '../constants/numbering';
import { LineSymbolImage } from '../lineSymbolImage';

export type LineMark = LineSymbolImage & {
  signShape?: MarkShape;
  sign?: string;
  subSign?: string;
  signPath?: number;
  subSignShape?: MarkShape;
  subSignPath?: number;
  jrUnionSigns?: string[];
  jrUnionSignPaths?: number[];
  btUnionSigns?: string[];
  btUnionSignPaths?: number[];
};
