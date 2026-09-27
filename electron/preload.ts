import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
  register: (username: string, password: string) => ipcRenderer.invoke('auth:register', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  changePassword: (currentPassword: string, newPassword: string) => ipcRenderer.invoke('auth:changePassword', currentPassword, newPassword),
  setLanguage: (language: 'ru' | 'en') => ipcRenderer.invoke('app:setLanguage', language),
  getProfile: () => ipcRenderer.invoke('auth:getProfile'),
  uploadProfileIconFromPC: () => ipcRenderer.invoke('auth:uploadProfileIconFromPC'),
  updateProfile: (profileData: any) => ipcRenderer.invoke('auth:updateProfile', profileData),

  getGames: () => ipcRenderer.invoke('games:getAll'),
  getGame: (id: number) => ipcRenderer.invoke('games:get', id),
  uploadGameIconFromPC: (scope: 'admin' | 'user') => ipcRenderer.invoke('games:uploadIconFromPC', scope),
  setUserGameIcon: (gameId: number, iconPath: string | null) => ipcRenderer.invoke('games:setUserIcon', gameId, iconPath),
  pickExecutable: () => ipcRenderer.invoke('games:pickExecutable'),
  getGenres: () => ipcRenderer.invoke('genres:getAll'),
  launchGame: (gameId: number) => ipcRenderer.invoke('games:launch', gameId),
  toggleFavorite: (gameId: number) => ipcRenderer.invoke('games:toggleFavorite', gameId),

  rateGame: (gameId: number, rating: 1|2|3|4|5, comment: string | null) => ipcRenderer.invoke('ratings:rate', gameId, rating, comment),
  getUserRating: (gameId: number) => ipcRenderer.invoke('ratings:getUserRating', gameId),
  getRatingDistribution: (gameId: number) => ipcRenderer.invoke('ratings:getDistribution', gameId),
  getGameReviews: (gameId: number) => ipcRenderer.invoke('ratings:getReviews', gameId),
  getUserReview: (gameId: number) => ipcRenderer.invoke('ratings:getUserReview', gameId),

  addGame: (gameData: any) => ipcRenderer.invoke('admin:addGame', gameData),
  updateGame: (id: number, updates: any) => ipcRenderer.invoke('admin:updateGame', id, updates),
  deleteGame: (id: number) => ipcRenderer.invoke('admin:deleteGame', id),
  addGenre: (genreData: { name: string; description: string }) => ipcRenderer.invoke('admin:addGenre', genreData),
  updateGenre: (id: number, genreData: { name: string; description: string }) => ipcRenderer.invoke('admin:updateGenre', id, genreData),
  deleteGenre: (id: number) => ipcRenderer.invoke('admin:deleteGenre', id),
});
