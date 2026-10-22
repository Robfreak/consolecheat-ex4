import assert from "node:assert/strict";
import test from "node:test";
import { pickParamAndIcon } from "./pick.ts";

test("a single file is the save, a folder prefers sce_sys/param.sfo and icon0.png", () => {
  assert.equal(pickParamAndIcon([]).reason, "empty");

  const alone = pickParamAndIcon([{ path: "renamed.bin" }]);
  assert.equal(alone.reason, "ok");
  assert.equal(alone.param?.path, "renamed.bin");
  assert.equal(alone.icon, null);

  const folder = pickParamAndIcon([
    { path: "CUSA00001/param.sfo" },
    { path: "CUSA00001/sce_sys/param.sfo" },
    { path: "CUSA00001/sce_sys/icon0.png" },
    { path: "CUSA00001/icon0.png" },
    { path: "CUSA00001/data.bin" },
  ]);
  assert.equal(folder.param?.path, "CUSA00001/sce_sys/param.sfo");
  assert.equal(folder.icon?.path, "CUSA00001/sce_sys/icon0.png");

  const windows = pickParamAndIcon([
    { path: "save\\sce_sys\\param.sfo" },
    { path: "save\\sce_sys\\icon0.png" },
  ]);
  assert.equal(windows.param?.path, "save\\sce_sys\\param.sfo");
  assert.equal(windows.icon?.path, "save\\sce_sys\\icon0.png");

  const missing = pickParamAndIcon([{ path: "sce_sys/icon0.png" }, { path: "sce_sys/keystone" }]);
  assert.equal(missing.reason, "no-param");
  assert.equal(missing.icon?.path, "sce_sys/icon0.png");
});
