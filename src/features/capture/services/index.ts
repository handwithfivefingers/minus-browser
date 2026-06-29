import { WebContents, NativeImage } from "electron";

export async function capturePage(
  webContents: WebContents,
  rect?: Electron.Rectangle,
  jpegQuality = 80,
): Promise<{ nativeImage: NativeImage; dataURL: string }> {
  const image = await webContents.capturePage(rect);
  const jpegBuffer = image.toJPEG(jpegQuality);
  const dataURL = `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
  return { nativeImage: image, dataURL };
}
