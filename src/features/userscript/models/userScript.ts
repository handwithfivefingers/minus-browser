import { v7 as uuid_v7 } from "uuid";
import { UserScriptRunAt } from "../types";

export interface IUserScript {
  id: string;
  name: string;
  source: string;
  matches: string[];
  enabled?: boolean;
  excludes?: string[];
  runAt?: UserScriptRunAt;
  builtIn?: boolean;
  createdAt?: number;
  updatedAt?: number;
}
export class UserScript implements IUserScript {
  id: string = uuid_v7();
  name: string = "";
  source: string = "";
  matches: string[] = ["*"];
  enabled: boolean = false;
  excludes?: string[];
  runAt: UserScriptRunAt = "document-start";
  builtIn: boolean = false;
  createdAt?: number = Date.now();
  updatedAt?: number = Date.now();

  constructor({ enabled, ...props }: IUserScript) {
    Object.assign(this, props);
    this.enabled = Boolean(enabled);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      source: this.source,
      matches: this.matches,
      excludes: this.excludes,
      runAt: this.runAt,
      enabled: this.enabled,
      builtIn: this.builtIn,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
