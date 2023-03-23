import { MarkShape } from '../constants/numbering';
import { LineSymbolImage } from '../lineSymbolImage';

export type LineMark = LineSymbolImage & {
  signShape?: MarkShape;
  sign?: string;
  signPath?: number;
  subSign?: string;
  subSignShape?: MarkShape;
  subSignPath?: number;
  extraSign?: string;
  extraSignShape?: MarkShape;
  extraSignPath?: number;
  jrUnionSigns?: string[];
  jrUnionSignPaths?: number[];
  btUnionSigns?: string[];
  btUnionSignPaths?: number[];
};
