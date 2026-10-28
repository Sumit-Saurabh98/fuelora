import { createMMKV, type MMKV } from 'react-native-mmkv';

import type { DeviceState } from './device-state';

export class MmkvDeviceState implements DeviceState {
  private storage: MMKV | null = null;

  // Created on first use, so importing the container never touches the native module.
  private get mmkv(): MMKV {
    this.storage ??= createMMKV({ id: 'fuelora.device' });
    return this.storage;
  }

  getString(key: string): string | null {
    return this.mmkv.getString(key) ?? null;
  }

  setString(key: string, value: string): void {
    this.mmkv.set(key, value);
  }
}
