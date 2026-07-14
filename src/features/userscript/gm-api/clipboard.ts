import { clipboard } from "electron";

export function handleClipboard(method: string, args: any[]): any {
  const [data, info] = args;

  if (!data) {
    throw new Error("Clipboard data is required");
  }

  const type = info?.type || "text";

  switch (type) {
    case "text":
      clipboard.writeText(String(data));
      break;
    case "html":
      clipboard.writeHTML(String(data));
      break;
    case "image":
      clipboard.writeImage(data);
      break;
    case "rtf":
      clipboard.writeRTF(String(data));
      break;
    default:
      clipboard.writeText(String(data));
      break;
  }

  return;
}
