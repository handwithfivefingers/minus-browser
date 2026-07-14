import { v7 as uuid_v7 } from "uuid";
import { IUserScriptRequire, IUserScriptResource, UserScriptGrant, UserScriptRunAt } from "../types";

export interface IUserScript {
  id: string;
  name: string;
  source: string;
  matches: string[];
  enabled?: boolean;
  excludes?: string[];
  includes?: string[];
  namespace?: string;
  version?: string;
  description?: string;
  author?: string;
  requires?: IUserScriptRequire[];
  resources?: IUserScriptResource[];
  grants?: UserScriptGrant[];
  runAt?: UserScriptRunAt;
  noframes?: boolean;
  icon?: string;
  downloadURL?: string;
  updateURL?: string;
  supportURL?: string;
  homepageURL?: string;
  license?: string;
  connect?: string[];
  builtIn?: boolean;
  rawMetadata?: string;
  createdAt?: number;
  updatedAt?: number;
}

export class UserScript implements IUserScript {
  id: string = uuid_v7();
  name: string = "";
  source: string = "";
  matches: string[] = ["*"];
  enabled: boolean = false;
  excludes?: string[] = [];
  includes?: string[] = [];
  namespace?: string = "";
  version?: string = "";
  description?: string = "";
  author?: string = "";
  requires?: IUserScriptRequire[] = [];
  resources?: IUserScriptResource[] = [];
  grants?: UserScriptGrant[] = [];
  runAt: UserScriptRunAt = "document-start";
  noframes?: boolean = false;
  icon?: string = "";
  downloadURL?: string = "";
  updateURL?: string = "";
  supportURL?: string = "";
  homepageURL?: string = "";
  license?: string = "";
  connect?: string[] = [];
  builtIn?: boolean = false;
  rawMetadata?: string = "";
  createdAt?: number = Date.now();
  updatedAt?: number = Date.now();

  constructor(props: Partial<IUserScript>) {
    Object.assign(this, props);
    this.enabled = Boolean(props.enabled);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      source: this.source,
      matches: this.matches,
      excludes: this.excludes,
      includes: this.includes,
      namespace: this.namespace,
      version: this.version,
      description: this.description,
      author: this.author,
      requires: this.requires,
      resources: this.resources,
      grants: this.grants,
      runAt: this.runAt,
      noframes: this.noframes,
      icon: this.icon,
      downloadURL: this.downloadURL,
      updateURL: this.updateURL,
      supportURL: this.supportURL,
      homepageURL: this.homepageURL,
      license: this.license,
      connect: this.connect,
      builtIn: this.builtIn,
      rawMetadata: this.rawMetadata,
      enabled: this.enabled,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
