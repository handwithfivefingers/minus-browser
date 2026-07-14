import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
//   id: string;
//   name: string;
//   source: string;
//   matches?: string[];
//   excludes?: string[];
//   includes?: string[];
//   namespace?: string;
//   version?: string;
//   description?: string;
//   author?: string;
//   grants?: string[];
//   noframes?: boolean;
//   connect?: string[];
//   requires?: Array<{ url: string }>;
//   resources?: Array<{ name: string; url: string }>;
//   runAt?: "document-start" | "document-end" | "document-idle";
//   enabled?: boolean;
const userscript = z.object({
  id: z.string().optional(),
  name: z.string(),
  source: z.string(),
  matches: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  includes: z.array(z.string()).optional(),
  namespace: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  grants: z.array(z.string()).optional(),
  noframes: z.boolean().optional(),
  connect: z.array(z.string()).optional(),
  requires: z.array(z.object({ url: z.string() })).optional(),
  resources: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
  runAt: z.enum(["document-start", "document-end", "document-idle"]).optional(),
  enabled: z.boolean().optional(),
});

export const userScriptResolve = zodResolver(userscript);
export type UserScriptSchema = z.infer<typeof userscript>;
