import { net } from "electron";
import { GMRequest } from "../types";

const activeRequests = new Map<string, { abort: () => void }>();

export function abortRequest(requestId: string) {
  const req = activeRequests.get(requestId);
  if (req) {
    req.abort();
    activeRequests.delete(requestId);
  }
}

export async function handleNetwork(
  event: Electron.IpcMainEvent,
  requestId: string,
  scriptId: string,
  args: any[],
): Promise<void> {
  const details = args[0] || {};
  const {
    url,
    method = "GET",
    headers,
    data,
    binary = false,
    nocache = false,
    timeout,
    responseType = "text",
    overrideMimeType,
  } = details;

  if (!url) {
    event.sender.send("GM:RESPONSE", {
      requestId,
      success: false,
      error: "URL is required",
    });
    return;
  }

  const controller = new AbortController();
  const requestInfo = { abort: () => controller.abort() };
  activeRequests.set(requestId, requestInfo);

  const fetchHeaders: Record<string, string> = { ...headers };
  if (nocache) {
    fetchHeaders["Cache-Control"] = "no-cache";
  }

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
    signal: controller.signal,
  };

  if (data) {
    fetchOptions.body = data;
  }

  if (timeout && timeout > 0) {
    const timeoutId = setTimeout(() => {
      controller.abort();
      event.sender.send("GM:RESPONSE", {
        requestId,
        success: false,
        error: "Timeout",
      });
      activeRequests.delete(requestId);
    }, timeout);

    requestInfo.abort = () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }

  try {
    const response = await fetch(url, fetchOptions);

    let responseData: any;
    if (responseType === "json") {
      responseData = await response.json();
    } else if (responseType === "blob" || responseType === "arraybuffer") {
      responseData = await response.arrayBuffer();
    } else if (responseType === "stream") {
      responseData = await response.text();
    } else {
      responseData = await response.text();
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const result = {
      finalUrl: response.url,
      readyState: 4,
      status: response.status,
      statusText: response.statusText,
      responseHeaders: JSON.stringify(responseHeaders),
      response: responseData,
      responseText: responseType === "text" ? responseData : await response.clone().text().catch(() => ""),
      responseXML: null as any,
    };

    event.sender.send("GM:RESPONSE", {
      requestId,
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.name === "AbortError") {
      event.sender.send("GM:RESPONSE", {
        requestId,
        success: false,
        error: "Aborted",
        aborted: true,
      });
    } else {
      event.sender.send("GM:RESPONSE", {
        requestId,
        success: false,
        error: error.message || String(error),
      });
    }
  } finally {
    activeRequests.delete(requestId);
  }
}
