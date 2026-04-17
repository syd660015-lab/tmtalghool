export type TMTType = 'TMT-A' | 'TMT-B' | 'TMT-B-AR' | 'TRAINING' | 'TMT-B-AR-TRAINING';

export interface TMTPoint {
  id: number;
  label: string;
  x: number;
  y: number;
  type: 'number' | 'letter';
  order: number;
}

export interface TestResult {
  uid: string;
  testType: TMTType;
  level?: number;
  timeInSeconds: number;
  errors: number;
  timestamp: any;
  rawPath?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: any;
}
