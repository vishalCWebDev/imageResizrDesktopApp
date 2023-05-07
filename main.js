const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  shell,
  dialog,
} = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const multer = require("multer");
const resizeImg = require("resize-img");
let mainWindow;
let sendErrorMessageUser;

// process.env.NODE_ENV = "production";
const isDev = process.env.NODE_ENV !== "production";
let imgSaveFolderLocation = (process.env.NODE_ENV = path.join(
  os.homedir(),
  "Desktop"
));

//create the main window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    title: "Image Reducer",
    width: isDev ? 800 : 1000,
    height: 900,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  //open devtools if in dev env
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));
};

const createAboutWindow = () => {
  const aboutWindow = new BrowserWindow({
    title: "About Image Reducer",
    width: 300,
    height: 300,
  });
  aboutWindow.loadFile(path.join(__dirname, "./renderer/about.html"));
};

const createGalleryWindow = () => {
 const galleryWindow = new BrowserWindow({
    title: "Image Reducer",
    width: isDev ? 800 : 1000,
    height: 900,
    // webPreferences: {
    //   contextIsolation: true,
    //   nodeIntegration: true,
    //   preload: path.join(__dirname, "preload.js"),
    // },
  });
  galleryWindow.loadFile(path.join(__dirname, "./renderer/gallery/gallery.html"));
}

//get img save location path
async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    defaultPath: app.getPath("desktop"),
    buttonLabel: "Select Path",
    properties: ["openDirectory"],
  });
  imgSaveFolderLocation = filePaths[0];

  return canceled ? undefined : filePaths[0];
}

//app is ready
app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleFileOpen);

  ipcMain.on("set-event", () => {
    mainWindow.webContents.send("sent-path", imgSaveFolderLocation);
  });

  createWindow();

  //impement menu
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  //remove mainWindow from memory on close
  mainWindow.on("closed", () => (mainWindow = null));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

//menu template
const menu = [
  {
    label: "help",
    submenu: [
      {
        label: "about",
        click: () => createAboutWindow(),
      },
    ],
  },
  {
    label: "Quit",
    click: () => app.quit(),
    accelerator: "CmdOrCtrl+W",
  },
];

//respond to ipcRenderer resize
ipcMain.on("image:resize", (e, options) => {
  options.dest = path.join(imgSaveFolderLocation, "image-size-reduser");
  resizeImage(options);
});

//resize the image
async function resizeImage({ imgPath, width, height, dest }) {
  try {
    const newPath = await resizeImg(fs.readFileSync(imgPath), {
      width: +width,
      height: +height,
    });

    const fileName = path.basename(imgPath);

    //create dest folder if not exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    //read path call function
     readFile(dest);

    //write file to dest folder
    fs.writeFileSync(path.join(dest, fileName), newPath);

    const fileUpdatePath = path.join(dest, fileName);
    fs.stat(fileUpdatePath, (error, stats) => {
      if (error) {
        sendErrorToClient("File not exit");
      } else {
        const isSize = convertBytes(stats.size);
        //send success to render and file size
        mainWindow.webContents.send("image:done", {
          fileName,
          isSize,
          imgSaveFolderLocation,
          fileUpdatePath,
        });
      }
    });
  
    //open image folder
    ipcMain.on("open-image-folder", () => {
      shell.openPath(fileUpdatePath);
    });
   
  } catch (error) {
    sendErrorToClient(error);
  }
}

// size convertBytes
const convertBytes = function (bytes) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  let k = 1000;
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const sendErrorToClient = (sendErrorMessageUser) =>
  mainWindow.webContents.send("setError", sendErrorMessageUser);

  

//read is file
const readFile = (directory) => {
  const fileDir = fs.readdirSync(directory);
  mainWindow.webContents.send("getImage", {
    directory,
    fileDir,
  });
}