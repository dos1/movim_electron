const windowStateKeeper = require('electron-window-state');
const {app, BrowserWindow, Menu, MenuItem, shell, ipcMain, Tray} = require('electron');
const path = require('path');

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
            "title": "Movim",
            "x": mainWindowState.x,
            "y": mainWindowState.y,
            "width": mainWindowState.width,
            "height": mainWindowState.height,
            "backgroundColor": '#3F51B5',
            "icon": path.join(__dirname, 'img/logo.png'),
            "webPreferences": {
                "allowDisplayingInsecureContent": true, // TODO: make it configurable
                "preload": path.join(__dirname, 'browser.js'),
                "nodeIntegration": false,
                "sandbox": true
            },
            "show": false
        }
    );
    mainWindowState.manage(mainWindow);

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    //mainWindow.openDevTools();

    var menuDef = [
        { label: 'File', submenu: [ { role: 'quit' } ] },
        { role: 'editMenu' },
        { label: 'View', submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'toggleFullscreen' }
        ] },
        { role: 'windowMenu' }
    ];
    if (process.platform == 'darwin') {
        menuDef[0] = {
            label: 'Application',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        };
        menuDef[2].submenu.push(
            { type: 'separator' },
            {
                label: 'Speech',
                submenu: [
                    { role: 'startspeaking' },
                    { role: 'stopspeaking' }
                ]
            }
        );
    }
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuDef));
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    mainWindow.once('ready-to-show', function() {
        mainWindow.show();
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
            win.setMenu(null);
            win.loadURL(url);
            win.on('closed', function() {
                win = null;
            });
        } else {
            shell.openExternal(url);
        }
    });

    mainWindow.webContents.on('did-fail-load', function(event, errorCode, errorDescription, validatedURL, isMainFrame) {
        if (isMainFrame) {
            mainWindow.loadURL('file://' + __dirname + '/error.html');
        }
    });

    ipcMain.on('open-external', function(event, url) {
        shell.openExternal(url);
    });

    ipcMain.on('notification',  function(event, counter) {
        app.setBadgeCount(counter);
        mainWindow.flashFrame(counter > 0);
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
