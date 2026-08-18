import { app, dialog, Menu, MenuItem } from 'electron'

class MenuApplication {
  menu: Menu | undefined

  constructor() {
    this.rebuild()
  }

  rebuild(customItems: MenuItem[] = []) {
    this.menu = Menu.buildFromTemplate([
      new MenuItem({
        role: 'appMenu',
      }),
      new MenuItem({ role: 'editMenu' }),
      new MenuItem({ role: 'windowMenu' }),
      ...(customItems.length > 0
        ? [
            new MenuItem({
              label: 'Shortcuts',
              submenu: Menu.buildFromTemplate(customItems),
            }),
          ]
        : []),
      new MenuItem({
        label: 'Help',
        submenu: [
          {
            label: `Thông tin về ${app.name}`,
            click: () => {
              // Hiển thị hộp thoại thông tin khi bấm vào
              dialog.showMessageBox({
                type: 'info',
                title: `Giới thiệu ${app.name}`,
                message: `${app.name} v${app.getVersion()}`,
                detail: `Electron: v${process.versions.electron}\nChromium: v${process.versions.chrome}\nNode.js: v${process.versions.node}`,
                buttons: ['Đóng'],
              })
            },
          },
        ],
      }),
    ])
    Menu.setApplicationMenu(this.menu)
  }
}

export const menuApplication = new MenuApplication()
