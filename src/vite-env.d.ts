/// <reference types="vite/client" />

interface DataTransferItem {
  webkitGetAsEntry?: () => FileSystemEntry | null;
}

interface HTMLInputElement {
  webkitdirectory: boolean;
}
