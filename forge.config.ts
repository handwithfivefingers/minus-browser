import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
// import { MakerDeb } from "@electron-forge/maker-deb";
// import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { appBundleId } from "./package.json";

const makers = [];
const { PLATFORM } = (import.meta as any).env;
if (PLATFORM === "WIN") {
  makers.push(new MakerZIP({}, ["darwin", "win32"]));
}
if (PLATFORM === "MAC") {
  makers.push(
    new MakerDMG({
      name: "MinusBrowser",
      format: "ULFO",
      overwrite: true,
    }),
  );
}
if (!PLATFORM) {
  makers.push(new MakerZIP({}, ["darwin", "win32"]));
  makers.push(
    new MakerDMG({
      name: "MinusBrowser",
      format: "ULFO",
      overwrite: true,
    }),
  );
}

const config: ForgeConfig = {
  makers: makers,
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          type: "git",
          owner: "me",
          name: "Minus Browser",
          url: "https://github.com/handwithfivefingers/minus-browser",
        },
        prerelease: true,
      },
    },
  ],
  packagerConfig: {
    name: "MinusBrowser",
    appBundleId: appBundleId,
    osxSign: {
      identity: "LocalMinusBrowser",
      optionsForFile: (filePath) => {
        return {
          hardenedRuntime: true,
          entitlements: "./entitlements.mac.plist", // Xem bước 3 bên dưới
        };
      },
    },
    icon: "./images/icon",
    asar: true,
  },
  rebuildConfig: {},
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
        {
          entry: "src/features/adblocker/adblocker-preload.ts",
          config: "vite.adb-preload.config.ts",
          target: "preload",
        },
        {
          entry: "src/features/findbar/findbar-preload.ts",
          config: "vite.findbar-preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
        {
          name: "sub_window",
          config: "vite.sub-window.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      // Disabled: Keychain-bound encryption breaks cookie persistence across
      // rebuilds/resigns until signing identity is fully stable (electron#45088).
      [FuseV1Options.EnableCookieEncryption]: false,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;

/**
 * CUSTOM APP SIGN
 * WAY 1: sudo codesign --force --deep --sign - /Applications/TruyenApp.app
 * WAY 2: sudo codesign --force --deep --sign LocalMinusBrowser /Applications/MinusBrowser.app
 *
 * Resign:
 * sudo codesign -fs - /Applications/TruyenApp.app --deep
 */
