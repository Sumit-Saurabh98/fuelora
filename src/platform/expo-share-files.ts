import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { ShareFiles, ShareKind } from './share-files';

export class ExpoShareFiles implements ShareFiles {
  async share(fileName: string, text: string, kind: ShareKind, dialogTitle: string): Promise<void> {
    // The cache directory: the OS may clear it, and the user keeps the shared copy anyway.
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    await file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: kind.mimeType, UTI: kind.uti, dialogTitle });
  }
}
