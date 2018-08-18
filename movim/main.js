const windowStateKeeper = require('electron-window-state');
const {app, BrowserWindow, Menu, MenuItem, shell, ipcMain, Tray} = require('electron');
const path = require('path');
const os = require('os');

var mainWindow = null;

require('electron-context-menu')({
    showInspectElement: false
});

app.commandLine.appendSwitch('force-color-profile', 'srgb');

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    // Set default dimensions if a previous state isn't available
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1280,
        defaultHeight: 768
    });

    // Create the browser window.
    mainWindow = new BrowserWindow(
        {
            "x": mainWindowState.x,
            "y": mainWindowState.y,
            "width": mainWindowState.width,
            "height": mainWindowState.height,
            backgroundColor: '#3F51B5',
            icon: path.join(__dirname, 'img/logo.png'),
            "webPreferences": {
                "allowDisplayingInsecureContent": true, // TODO: make it configurable
                "preload": path.join(__dirname, 'browser.js'),
                "nodeIntegration": false,
                "sandbox": true
            }
        }
    );
    mainWindowState.manage(mainWindow);

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    //mainWindow.openDevTools();

    mainWindow.setMenuBarVisibility(false);

    if (os.platform() === 'darwin') {
        var template = [{
            label: "Application",
            submenu: [
                { label: "About Movim", selector: "orderFrontStandardAboutPanel:" },
                { type: "separator" },
                { label: "Quit", accelerator: "CmdOrCtrl+Q", click: function() { app.quit(); }}
            ]}, {
            label: "Edit",
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
            ]}
        ];
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }


    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    const showHide = function() {
        if(mainWindow.isVisible()) {
            mainWindow.hide();
        }
        else {
            mainWindow.show();
        }
    };

    if (!app.dock) {
        var appIcon = new Tray(__dirname + '/img/logo_tray.png');
        appIcon.setToolTip('Movim');
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show/hide',
                click: showHide
            },
            {
                label: 'Quit',
                click: function() {
                    app.isQuiting = true;
                    app.quit();
                }
            }
        ]);
        appIcon.setContextMenu(contextMenu);
        appIcon.on('click', showHide);
    }

    app.on('activate', function(event) {
         mainWindow.show();
    });

    app.on('before-quit', function (event) {
        app.isQuiting = true;
    });

    mainWindow.on('close', function (event) {
        if(!app.isQuiting){
            event.preventDefault();
            mainWindow.hide();
        }

        return false;
    });

    mainWindow.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        if((url.search('/?visio/') > -1) || (url.search('/?popuptest') > -1)) {
            var win = new BrowserWindow(
                {
                    "webPreferences": {
                        "allowDisplayingInsecureContent": true, // TODO: make it configurable
                        "preload": path.join(__dirname, 'browser.js'),
                        "nodeIntegration": false
                    }
                }
            );
            win.setMenuBarVisibility(false);
            win.loadURL(url);
            win.on('closed', function() {
                win = null;
            });
        } else {
            shell.openExternal(url);
        }
    });

    ipcMain.on('open-external', function(event, url) {
        shell.openExternal(url);
    });

    ipcMain.on('notification',  function(event, counter) {
        app.setBadgeCount(counter);
        if(counter > 0) {
            if(app.dock) {
                app.dock.bounce();
            } else {
                appIcon.setImage(path.join(__dirname, '/img/logo_tray_notifs.png'));
            }
        } else {
            if(!app.dock) {
                appIcon.setImage(path.join(__dirname, '/img/logo_tray.png'));
            }
        }
    });

});
