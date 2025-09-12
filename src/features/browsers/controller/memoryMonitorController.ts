import { BrowserView, webContents, app, WebContentsView } from "electron";
import * as os from "os";
import * as process from "process";

interface MemoryInfo {
  tabId: string;
  title: string;
  url: string;
  memoryUsage: {
    workingSetSize: number; // Physical memory in KB
    peakWorkingSetSize: number;
    privateBytes: number; // Private memory in KB
    sharedBytes: number; // Shared memory in KB
  };
  cpuUsage: {
    percentCPUUsage: number;
    idleWakeupsPerSecond: number;
  };
  timestamp: number;
}

interface SystemMemoryInfo {
  totalMemory: number; // Total system memory in MB
  freeMemory: number; // Free system memory in MB
  usedMemory: number; // Used system memory in MB
  browserMemory: number; // Total browser memory usage in MB
  memoryPressure: "low" | "medium" | "high" | "critical";
}

class MemoryMonitor {
  private tabMemoryMap: Map<string, MemoryInfo> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryInfo[][] = []; // Store last 10 readings
  private maxHistoryLength = 10;
  private monitoringFrequency = 30000; // 30 seconds
  private memoryThresholds = {
    warning: 100, // MB per tab
    critical: 200, // MB per tab
    system: 0.8, // 80% of total system memory
  };
  view: WebContentsView;

  constructor(view: WebContentsView) {
    this.view = view;
    this.startMonitoring();
  }

  // Start memory monitoring
  startMonitoring() {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(async () => {
      await this.collectMemoryData();
      this.analyzeMemoryPressure();
    }, this.monitoringFrequency);

    console.log("Memory monitoring started");
  }

  // Stop memory monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log("Memory monitoring stopped");
    }
  }

  // Register a tab for monitoring
  registerTab(tabId: string, view: BrowserView, title: string = "Unknown", url: string = "") {
    if (!this.tabMemoryMap.has(tabId)) {
      this.tabMemoryMap.set(tabId, {
        tabId,
        title,
        url,
        memoryUsage: {
          workingSetSize: 0,
          peakWorkingSetSize: 0,
          privateBytes: 0,
          sharedBytes: 0,
        },
        cpuUsage: {
          percentCPUUsage: 0,
          idleWakeupsPerSecond: 0,
        },
        timestamp: Date.now(),
      });
    }
  }

  // Unregister a tab from monitoring
  unregisterTab(tabId: string) {
    this.tabMemoryMap.delete(tabId);
  }

  // Collect memory data for all tabs
  private async collectMemoryData() {
    const currentSnapshot: MemoryInfo[] = [];

    for (const [tabId, tabInfo] of this.tabMemoryMap) {
      try {
        const view = this.view;
        if (!view || view.webContents.isDestroyed()) {
          continue;
        }

        // Get memory info from webContents
        // const memoryInfo = await view.webContents.getResourceUsage();

        const memoryInfo = {
          workingSetSize: 0,
          peakWorkingSetSize: 0,
          private: 0,
          shared: 0,
          cpu: {
            percentCPUUsage: 0,
            idleWakeupsPerSecond: 0,
          },
        };
        // Update tab memory info
        const updatedInfo: MemoryInfo = {
          ...tabInfo,
          memoryUsage: {
            workingSetSize: memoryInfo.workingSetSize,
            peakWorkingSetSize: memoryInfo.peakWorkingSetSize,
            privateBytes: memoryInfo.private || 0,
            sharedBytes: memoryInfo.shared || 0,
          },
          cpuUsage: memoryInfo.cpu
            ? {
                percentCPUUsage: memoryInfo.cpu.percentCPUUsage,
                idleWakeupsPerSecond: memoryInfo.cpu.idleWakeupsPerSecond,
              }
            : { percentCPUUsage: 0, idleWakeupsPerSecond: 0 },
          timestamp: Date.now(),
        };

        this.tabMemoryMap.set(tabId, updatedInfo);
        currentSnapshot.push(updatedInfo);
      } catch (error) {
        console.warn(`Failed to get memory info for tab ${tabId}:`, error);
      }
    }

    // Store snapshot in history
    this.memoryHistory.push(currentSnapshot);
    if (this.memoryHistory.length > this.maxHistoryLength) {
      this.memoryHistory.shift();
    }

    // Emit memory update event
    this.emit("memory-updated", currentSnapshot);
  }

  // Get system memory information
  getSystemMemoryInfo(): SystemMemoryInfo {
    const totalMemory = Math.round(os.totalmem() / 1024 / 1024); // MB
    const freeMemory = Math.round(os.freemem() / 1024 / 1024); // MB
    const usedMemory = totalMemory - freeMemory;

    // Calculate browser memory usage
    const browserMemory = Array.from(this.tabMemoryMap.values()).reduce(
      (total, tab) => total + tab.memoryUsage.workingSetSize / 1024,
      0
    ); // Convert KB to MB

    // Determine memory pressure
    const memoryUsageRatio = usedMemory / totalMemory;
    let memoryPressure: SystemMemoryInfo["memoryPressure"] = "low";

    if (memoryUsageRatio > 0.9) memoryPressure = "critical";
    else if (memoryUsageRatio > 0.8) memoryPressure = "high";
    else if (memoryUsageRatio > 0.6) memoryPressure = "medium";

    return {
      totalMemory,
      freeMemory,
      usedMemory,
      browserMemory: Math.round(browserMemory),
      memoryPressure,
    };
  }

  // Get memory info for specific tab
  getTabMemoryInfo(tabId: string): MemoryInfo | null {
    return this.tabMemoryMap.get(tabId) || null;
  }

  // Get all tabs memory info
  getAllTabsMemoryInfo(): MemoryInfo[] {
    return Array.from(this.tabMemoryMap.values());
  }

  // Get memory-heavy tabs
  getMemoryHeavyTabs(threshold: number = 100): MemoryInfo[] {
    return Array.from(this.tabMemoryMap.values())
      .filter((tab) => tab.memoryUsage.workingSetSize / 1024 > threshold) // Convert KB to MB
      .sort((a, b) => b.memoryUsage.workingSetSize - a.memoryUsage.workingSetSize);
  }

  // Analyze memory pressure and suggest actions
  private analyzeMemoryPressure() {
    const systemInfo = this.getSystemMemoryInfo();
    const memoryHeavyTabs = this.getMemoryHeavyTabs(this.memoryThresholds.warning);

    // Check for critical memory situation
    if (systemInfo.memoryPressure === "critical") {
      this.emit("memory-critical", {
        systemInfo,
        heavyTabs: memoryHeavyTabs.slice(0, 5), // Top 5 memory consumers
      });
    }

    // Check for high memory tabs
    const criticalTabs = this.getMemoryHeavyTabs(this.memoryThresholds.critical);
    if (criticalTabs.length > 0) {
      this.emit("tabs-memory-warning", criticalTabs);
    }

    // Log memory statistics
    console.log(
      `Memory Stats: ${systemInfo.browserMemory}MB browser, ${systemInfo.usedMemory}MB system (${systemInfo.memoryPressure})`
    );
  }

  // Get memory statistics for UI display
  getMemoryStats() {
    const systemInfo = this.getSystemMemoryInfo();
    const allTabs = this.getAllTabsMemoryInfo();
    const avgMemoryPerTab =
      allTabs.length > 0
        ? allTabs.reduce((sum, tab) => sum + tab.memoryUsage.workingSetSize / 1024, 0) / allTabs.length
        : 0;

    return {
      system: systemInfo,
      browser: {
        totalTabs: allTabs.length,
        totalMemoryMB: systemInfo.browserMemory,
        averageMemoryPerTabMB: Math.round(avgMemoryPerTab),
        heavyTabsCount: this.getMemoryHeavyTabs(this.memoryThresholds.warning).length,
      },
      topMemoryTabs: this.getMemoryHeavyTabs().slice(0, 5),
    };
  }

  // Get memory trend analysis
  getMemoryTrend(tabId?: string) {
    if (!tabId) {
      // System memory trend
      return this.memoryHistory.map((snapshot) => ({
        timestamp: snapshot.length > 0 ? snapshot[0].timestamp : Date.now(),
        totalMemory: snapshot.reduce((sum, tab) => sum + tab.memoryUsage.workingSetSize / 1024, 0),
      }));
    } else {
      // Specific tab memory trend
      return this.memoryHistory
        .map((snapshot) => {
          const tabData = snapshot.find((tab) => tab.tabId === tabId);
          return {
            timestamp: tabData?.timestamp || Date.now(),
            memory: tabData ? tabData.memoryUsage.workingSetSize / 1024 : 0,
          };
        })
        .filter((data) => data.memory > 0);
    }
  }

  // Configure monitoring settings
  setMonitoringFrequency(seconds: number) {
    this.monitoringFrequency = seconds * 1000;
    if (this.monitoringInterval) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  setMemoryThresholds(warning: number, critical: number, system: number) {
    this.memoryThresholds = { warning, critical, system };
  }

  // Force memory collection (for manual refresh)
  async forceMemoryCollection() {
    await this.collectMemoryData();
    return this.getMemoryStats();
  }

  // Clean up
  destroy() {
    this.stopMonitoring();
    this.tabMemoryMap.clear();
    this.memoryHistory = [];
  }

  // Event emitter methods
  private emit(event: string, data: any) {
    console.log(`Memory Monitor Event: ${event}`, data);
    // Implement your event emission logic here
    // You can integrate with your existing event system
  }

  // Placeholder - implement based on your tab management
  private getViewByTabId(tabId: string): BrowserView | null {
    // Return the BrowserView associated with this tab ID
    return null;
  }
}

export default MemoryMonitor;

// Usage example interface for React components
export interface MemoryMonitorData {
  systemMemory: SystemMemoryInfo;
  browserStats: {
    totalTabs: number;
    totalMemoryMB: number;
    averageMemoryPerTabMB: number;
    heavyTabsCount: number;
  };
  topMemoryTabs: MemoryInfo[];
  memoryTrend: { timestamp: number; totalMemory: number }[];
}
