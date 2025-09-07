import { createContext, useContext, useMemo, useReducer } from "react";

export interface ExtraElement extends HTMLDivElement {
  goBack: () => void;
  goForward: () => void;
  loadURL: (v: string) => void;
}
interface IThemeContent {
  mode: "light" | "dark";
  spotlight?: boolean;
  webView: ExtraElement | null;
}
type IThemeActionType = "SET_MODE" | "SET_WEBVIEW";

interface IAction<T> {
  type: IThemeActionType;
  payload: T;
}

const initState: IThemeContent = {
  mode: "light",
  webView: null,
};

interface IThemeApiContext {
  setMode: (mode: "light" | "dark") => void;
  setWebview: (webviewRef: HTMLDivElement) => void;
}
const ThemeContext = createContext(initState);

const reducer = <T,>(state: IThemeContent, action: IAction<T>) => {
  switch (action.type) {
    case "SET_MODE":
      return {
        ...state,
        mode: action.payload,
      };
    case "SET_WEBVIEW":
      return {
        ...state,
        webView: action.payload,
      };
    default:
      return state;
  }
};

const ThemeApisContext = createContext({} as IThemeApiContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer<any>, initState);
  const apis = useMemo(() => {
    return {
      setMode: (mode: "light" | "dark") => {
        dispatch({
          type: "SET_MODE",
          payload: mode,
        });
      },
      setWebview: (webviewRef: HTMLDivElement) => {
        dispatch({
          type: "SET_WEBVIEW",
          payload: webviewRef,
        });
      },
    };
  }, []);
  return (
    <ThemeApisContext.Provider value={apis}>
      <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
    </ThemeApisContext.Provider>
  );
};

export const useThemeApis = () => {
  return useContext(ThemeApisContext);
};
export const useThemeValues = () => {
  return useContext(ThemeContext);
};
