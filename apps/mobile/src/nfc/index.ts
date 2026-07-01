import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export class NfcUnavailableError extends Error {
  constructor() {
    super('NFC reader is not available');
    this.name = 'NfcUnavailableError';
  }
}

export type NfcReader = {
  isAvailable: () => Promise<boolean>;
  isEnabled: () => Promise<boolean>;
  openSettings: () => Promise<boolean>;
  readUid: () => Promise<string>;
  cancel: () => Promise<void>;
};

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  await NfcManager.start();
  initialized = true;
}

export const nfcReader: NfcReader = {
  async isAvailable(): Promise<boolean> {
    try {
      return await NfcManager.isSupported();
    } catch {
      return false;
    }
  },

  async isEnabled(): Promise<boolean> {
    try {
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  },

  async openSettings(): Promise<boolean> {
    try {
      return await NfcManager.goToNfcSetting();
    } catch {
      return false;
    }
  },

  async readUid(): Promise<string> {
    await ensureInitialized();
    try {
      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();
      const uid = tag?.id;
      if (!uid) {
        throw new NfcUnavailableError();
      }
      return uid.toLowerCase();
    } finally {
      void NfcManager.cancelTechnologyRequest();
    }
  },

  async cancel(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      return;
    }
  },
};
