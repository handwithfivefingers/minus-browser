import { dialog } from "electron";

export class ErrorServices {
  constructor(props: any) {
    return dialog.showMessageBox({
      type: "error",
      title: "Error",
      message: props.message,
    });
  }
}
