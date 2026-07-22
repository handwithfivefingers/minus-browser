import { Menu, MenuItem } from 'electron'

class MenuApplication {
  menu: Menu | undefined

  constructor() {
    this.rebuild()
  }

  rebuild(customItems: MenuItem[] = []) {
    this.menu = Menu.buildFromTemplate([
      new MenuItem({ role: 'appMenu' }),
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
    ])
    Menu.setApplicationMenu(this.menu)
  }
}

export const menuApplication = new MenuApplication()
