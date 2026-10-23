export type LocalFile = {
  file: File;
  path: string;
};

const MAX_WALK = 2000;

export function filesFromList(list: FileList | readonly File[]): LocalFile[] {
  return [...list].map((file) => ({
    file,
    path: file.webkitRelativePath || file.name,
  }));
}

function readBatches(reader: FileSystemDirectoryReader, left: number): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const batch = () => {
      reader.readEntries((entries) => {
        if (!entries.length || all.length >= left) {
          resolve(all);
          return;
        }
        all.push(...entries);
        batch();
      }, reject);
    };
    batch();
  });
}

async function walk(entry: FileSystemEntry, left: number): Promise<LocalFile[]> {
  if (left <= 0) return [];
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, () => reject(new Error("unreadable")));
    });
    return [{ file, path: entry.fullPath || file.name }];
  }
  if (!entry.isDirectory) return [];
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children = await readBatches(reader, left);
  const out: LocalFile[] = [];
  for (const child of children) {
    if (out.length >= left) break;
    out.push(...(await walk(child, left - out.length)));
  }
  return out;
}

export async function filesFromTransfer(transfer: DataTransfer): Promise<LocalFile[]> {
  const entries: FileSystemEntry[] = [];
  for (const item of transfer.items) {
    const entry = item.webkitGetAsEntry?.() ?? null;
    if (entry) entries.push(entry);
  }
  if (entries.length) {
    const out: LocalFile[] = [];
    for (const entry of entries) {
      if (out.length >= MAX_WALK) break;
      out.push(...(await walk(entry, MAX_WALK - out.length)));
    }
    if (out.length) return out;
  }
  return filesFromList(transfer.files);
}
