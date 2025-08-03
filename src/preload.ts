import { contextBridge, ipcRenderer } from 'electron';

interface MediaInfo {
  title?: string;
  artist?: string;
  artwork?: string;
  isPlaying?: boolean;
  position?: number;
  duration?: number;
  volume?: number;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getCurrentMedia: (): Promise<MediaInfo | null> => ipcRenderer.invoke('get-current-media'),
  playPauseMedia: (): Promise<boolean> => ipcRenderer.invoke('media-play-pause'),
  nextTrack: (): Promise<boolean> => ipcRenderer.invoke('media-next'),
  previousTrack: (): Promise<boolean> => ipcRenderer.invoke('media-previous'),
  setVolume: (volume: number): Promise<boolean> => ipcRenderer.invoke('media-set-volume', volume),
  
  onMediaChange: (callback: (media: MediaInfo | null) => void) => {
    // For now, we'll use polling in the renderer
    // In a more advanced implementation, we could set up event listeners
  },
  
  removeMediaListeners: () => {
    // Placeholder for cleanup
  }
});
