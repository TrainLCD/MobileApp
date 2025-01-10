type FeedbackDeviceInfo = {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  modelId: string;
  designName: string | null;
  productName: string | null;
  deviceYearClass: number | null;
  totalMemory: number | null;
  supportedCpuArchitectures: string[] | null;
  osName: string | null;
  osVersion: string | null;
  osBuildId: string | null;
  osInternalBuildId: string | null;
  osBuildFingerprint: string | null;
  platformApiLevel: number | null;
  locale: string;
};

export default FeedbackDeviceInfo;
