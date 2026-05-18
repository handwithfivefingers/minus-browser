// shared/types/tab-plugin.ts

export interface ITabLifecycleHooks {
  onDidStopLoad?: (ctx: IExecutionContext) => void;
  onWillNavigate?: (ctx: IExecutionContext) => void;
  onConsoleMessage?: (ctx: IExecutionContext, message: string) => void;
  onDestroy?: (ctx: IExecutionContext) => void;
  onDidNavigate?: (ctx: IExecutionContext) => void;
  onFoundInPage?: (ctx: IExecutionContext, result: any) => void;
}

export interface ITabPlugin {
  readonly name: string;
  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext): void;
}
