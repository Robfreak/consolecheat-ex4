export type NamedFile = {
  path: string;
};

function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function basename(path: string): string {
  const parts = normalize(path).split("/");
  return parts[parts.length - 1] ?? path;
}

function prefer<T extends NamedFile>(files: readonly T[], base: string): T | null {
  const matches = files.filter((file) => basename(file.path).toLowerCase() === base);
  const inSceSys = matches.find((file) => /(?:^|\/)sce_sys\/[^/]+$/i.test(normalize(file.path)));
  return inSceSys ?? matches[0] ?? null;
}

export type PickResult<T extends NamedFile> = {
  param: T | null;
  icon: T | null;
  reason: "empty" | "no-param" | "ok";
};

/**
 * One file is tried as the SFO even if it was renamed.
 * A folder (more than one file) must contain param.sfo. icon0.png is optional.
 * A sce_sys path wins when several copies are present.
 */
export function pickParamAndIcon<T extends NamedFile>(files: readonly T[]): PickResult<T> {
  if (files.length === 0) return { param: null, icon: null, reason: "empty" };
  if (files.length === 1) return { param: files[0] ?? null, icon: null, reason: "ok" };
  const param = prefer(files, "param.sfo");
  const icon = prefer(files, "icon0.png");
  if (!param) return { param: null, icon, reason: "no-param" };
  return { param, icon, reason: "ok" };
}
