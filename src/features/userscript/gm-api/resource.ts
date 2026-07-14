import { net } from "electron";

export async function handleGetResourceText(
  scriptResources: Array<{ name: string; url: string; content?: string }>,
  args: any[],
): Promise<string | undefined> {
  const [name] = args;
  const resource = scriptResources?.find((r) => r.name === name);
  if (!resource) return undefined;

  if (resource.content) return resource.content;

  try {
    const response = await fetch(resource.url);
    const text = await response.text();
    resource.content = text;
    return text;
  } catch {
    return undefined;
  }
}

export async function handleGetResourceURL(
  scriptResources: Array<{ name: string; url: string; content?: string; contentType?: string }>,
  args: any[],
): Promise<string | undefined> {
  const [name] = args;
  const resource = scriptResources?.find((r) => r.name === name);
  if (!resource) return undefined;

  try {
    const response = await fetch(resource.url);
    const blob = await response.blob();

    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = resource.contentType || blob.type || "application/octet-stream";

    return `data:${mimeType};base64,${base64}`;
  } catch {
    return undefined;
  }
}
