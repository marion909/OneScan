export interface UNCSettings {
  uncPath: string;
  username: string;
  password: string;
  domain: string;
}

export const EMPTY_SETTINGS: UNCSettings = {
  uncPath: '',
  username: '',
  password: '',
  domain: '',
};
