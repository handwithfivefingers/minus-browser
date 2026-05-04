import { UserScript } from "../class/script";

export type UserScriptRunAt =
  | "document-start"
  | "document-end"
  | "document-idle";

export interface IUserScript {
  id: string;
  name: string;
  source: string;
  matches: string[];
  excludes: string[];
  runAt: UserScriptRunAt;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface IUserScriptStore {
  scripts: UserScript[];
}
