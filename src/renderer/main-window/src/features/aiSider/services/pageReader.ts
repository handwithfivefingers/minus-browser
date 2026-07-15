import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";

export async function getPageText(): Promise<string> {
  try {
    const result = await window.api.INVOKE<string>(IPC_INVOKE_CHANNEL.AI_GET_PAGE_TEXT);
    return result || "";
  } catch (error) {
    console.error("Failed to get page text:", error);
    throw new Error("Could not extract page content. Make sure a tab is open and try again.");
  }
}

export async function getSelectedText(): Promise<string> {
  try {
    const result = await window.api.INVOKE<string>(IPC_INVOKE_CHANNEL.AI_GET_SELECTED_TEXT);
    return result || "";
  } catch (error) {
    console.error("Failed to get selected text:", error);
    throw new Error("Could not get selected text. Select text on the page and try again.");
  }
}
