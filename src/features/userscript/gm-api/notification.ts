import { Notification } from "electron";

export function handleNotification(
  event: Electron.IpcMainEvent,
  requestId: string,
  scriptId: string,
  args: any[],
): void {
  const details = args[0] || {};
  const { text, title, image, silent, onclick, ondone } = details;

  if (!text) {
    event.sender.send("GM:RESPONSE", {
      requestId,
      success: false,
      error: "Notification text is required",
    });
    return;
  }

  const notification = new Notification({
    title: title || "UserScript",
    body: text,
    silent,
    icon: image || undefined,
  });

  notification.on("click", () => {
    event.sender.send("GM:PROGRESS", {
      requestId,
      type: "notification-click",
    });
  });

  notification.on("close", () => {
    event.sender.send("GM:RESPONSE", {
      requestId,
      success: true,
    });
  });

  notification.show();

  event.sender.send("GM:RESPONSE", {
    requestId,
    success: true,
    data: { notificationId: requestId },
  });
}
