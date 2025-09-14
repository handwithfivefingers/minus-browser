import { app, session } from "electron";
import path from "node:path";
export class ExtensionController {
  extensionName: string = "";
  extensionId: string = "";

  constructor(props: { extensionName: string; extensionId: string }) {
    Object.assign(this, props);
    this.initialize();
  }

  async initialize() {
    const extensionBase = path.resolve("extension", this.extensionId);
    try {
      const extension = await session.defaultSession.extensions.loadExtension(extensionBase, {
        allowFileAccess: true,
      });
      console.log("Loaded extension:", extension.name, extension.version);
    } catch (err) {
      console.error(`Failed to load extension ${this.extensionName}`, err);
    }
  }

  destroy() {
    session.defaultSession.removeExtension(this.extensionId);
  }
}
