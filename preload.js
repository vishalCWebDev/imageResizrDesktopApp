const { contextBridge, ipcRenderer } = require("electron");
const os = require("os");
const path = require("path");
const Toastfy = require("toastify-js");
const fs = require("fs");

contextBridge.exposeInMainWorld("fs", {
  readFile: () => {
    fs.statSync(...args);
  },
});

contextBridge.exposeInMainWorld("os", {
  homedir: () => os.homedir(),
});

contextBridge.exposeInMainWorld("path", {
  join: (...args) => path.join(...args),
});

contextBridge.exposeInMainWorld("Toastfy", {
  toast: (options) => Toastfy(options).showToast(),
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),
});

contextBridge.exposeInMainWorld("openFiles", {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
});

contextBridge.exposeInMainWorld("setPathAPI", {
  setPath: (data) => ipcRenderer.on("sent-path", data),
});
