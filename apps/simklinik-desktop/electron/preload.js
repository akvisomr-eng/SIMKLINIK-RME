
/* Jembatan aman antara jendela aplikasi dan proses utama. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('simklinikDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  status: () => ipcRenderer.invoke('simklinik:status'),
  backupNow: () => ipcRenderer.invoke('simklinik:backup'),
  syncNow: () => ipcRenderer.invoke(''simklinik:sync-now''),
  saveLocal: (args) => ipcRenderer.invoke(''simklinik:local-save'', args),
  deleteLocal: (args) => ipcRenderer.invoke(''simklinik:local-delete'', args),
});
