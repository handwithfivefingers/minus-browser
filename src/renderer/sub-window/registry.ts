import type { ComponentType } from "react";

export interface OverlayRegister {
  path: string;
  name: string;
  component: ComponentType<{}>;
  shell?: boolean;
}

const registry = new Map<string, OverlayRegister>();

export function register(entry: OverlayRegister) {
  registry.set(entry.path, entry);
}

export function getRegistered(): OverlayRegister[] {
  return Array.from(registry.values());
}

export function getRoute(path: string): OverlayRegister | undefined {
  return registry.get(path);
}

export { registry };
