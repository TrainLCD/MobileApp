export type EligibilityType = 'eligible' | 'limitExceeded' | 'banned';

type EligibilityDocData = {
  eligibilityType: EligibilityType;
};

export default EligibilityDocData;
