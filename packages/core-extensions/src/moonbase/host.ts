import * as electron from "electron";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import getNatives from "./native";

const natives = getNatives();

const confirm = (action: string) =>
  electron.dialog
    .showMessageBox({
      title: "Are you sure?",
      message: `Are you sure? This will ${action} and restart Discord.`,
      type: "warning",
      buttons: ["OK", "Cancel"]
    })
    .then((r) => r.response === 0);

async function updateAndRestart() {
  if (!(await confirm("update moonlight"))) return;
  const newVersion = await natives.checkForMoonlightUpdate();

  if (newVersion === null) {
    electron.dialog.showMessageBox({ message: "You are already on the latest version of moonlight." });
    return;
  }

  try {
    await natives.updateMoonlight();
    await electron.dialog.showMessageBox({ message: "Update successful, restarting Discord." });
    electron.app.relaunch();
    electron.app.exit(0);
  } catch {
    await electron.dialog.showMessageBox({
      message: "Failed to update moonlight. Please use the installer instead.",
      type: "error"
    });
  }
}

async function resetConfig() {
  if (!(await confirm("reset your configuration"))) return;

  const config = await moonlightHost.getConfigPath();
  const dir = path.dirname(config);
  const branch = path.basename(config, ".json");
  await fs.rename(config, path.join(dir, `${branch}-backup-${Math.floor(Date.now() / 1000)}.json`));

  await electron.dialog.showMessageBox({ message: "Configuration reset, restarting Discord." });
  electron.app.relaunch();
  electron.app.exit(0);
}

function showAbout() {
  electron.dialog.showMessageBox({
    title: "About moonlight",
    message: `moonlight ${moonlightHost.branch} ${moonlightHost.version}`
  });
}

electron.app.whenReady().then(() => {
  const original = electron.Menu.buildFromTemplate;
  electron.Menu.buildFromTemplate = function (entries) {
    const i = entries.findIndex((e) => e.label === "Check for Updates...");
    if (i === -1) return original.call(this, entries);

    entries.splice(i + 1, 0, {
      label: "moonlight",
      submenu: [
        { label: "Update and restart", click: updateAndRestart },
        { label: "Reset config", click: resetConfig },
        { label: "About", click: showAbout }
      ]
    });

    return original.call(this, entries);
  };
});
