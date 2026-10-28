import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import type { BackupFiles, PickedFile } from './backup-files';

/** How many safety copies to keep; older ones are deleted. */
const KEEP_SAFETY_COPIES = 3;

export class ExpoBackupFiles implements BackupFiles {
  async pick(): Promise<PickedFile | null> {
    // `.fuelora` has no standard MIME type everywhere, so accept any file and validate it.
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const [asset] = result.assets;
    return asset ? { uri: asset.uri, name: asset.name } : null;
  }

  readText(uri: string): Promise<string> {
    return new File(uri).text();
  }

  async saveSafetyCopy(fileName: string, text: string): Promise<string> {
    // Documents, not cache: the OS may clear the cache, and this copy is the undo for a restore.
    const dir = new Directory(Paths.document, 'safety-backups');
    if (!dir.exists) dir.create({ intermediates: true });
    const file = new File(dir, fileName);
    file.create({ overwrite: true });
    await file.write(text);
    const copies = dir
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .sort((a, b) => b.name.localeCompare(a.name));
    for (const old of copies.slice(KEEP_SAFETY_COPIES)) old.delete();
    return fileName;
  }
}
