import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
  register: (username: string, password: string) => ipcRenderer.invoke('auth:register', username, password),

  getGames: () => ipcRenderer.invoke('games:getAll'),
  getGame: (id: number) => ipcRenderer.invoke('games:get', id),
  launchGame: (gameId: number, userId: number) => ipcRenderer.invoke('games:launch', gameId, userId),

  rateGame: (userId: number, gameId: number, rating: 1|2|3|4|5) => ipcRenderer.invoke('ratings:rate', userId, gameId, rating),
  getUserRating: (userId: number, gameId: number) => ipcRenderer.invoke('ratings:getUserRating', userId, gameId),

  addGame: (gameData: any, adminUserId: number) => ipcRenderer.invoke('admin:addGame', gameData, adminUserId),
  updateGame: (id: number, updates: any, adminUserId: number) => ipcRenderer.invoke('admin:updateGame', id, updates, adminUserId),
  deleteGame: (id: number, adminUserId: number) => ipcRenderer.invoke('admin:deleteGame', id, adminUserId),
});