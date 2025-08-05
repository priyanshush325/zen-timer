import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { exec } from 'child_process';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Set app name for Mac dock
app.setName('Zen Timer');

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Zen Timer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools only in development.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// AppleScript execution helper
function execAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use full path to osascript for packaged apps
    const osascriptPath = '/usr/bin/osascript';
    const command = `${osascriptPath} -e '${script.replace(/'/g, "'\"'\"'")}'`;
    
    console.log('Executing AppleScript command:', command);
    
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('AppleScript execution error:', error);
        console.error('stderr:', stderr);
        
        // If it's a permission error, try to trigger permission request
        if (stderr.includes('not authorized') || stderr.includes('not allowed')) {
          console.log('Permission denied - this should trigger a permission request');
        }
        
        reject(error);
        return;
      }
      console.log('AppleScript result:', stdout.trim());
      resolve(stdout.trim());
    });
  });
}

// Media info functions
interface MediaInfo {
  title?: string;
  artist?: string;
  artwork?: string;
  isPlaying?: boolean;
  position?: number;
  duration?: number;
  volume?: number;
}

async function getCurrentMediaFromSpotify(): Promise<MediaInfo | null> {
  try {
    const script = `
      tell application "System Events"
        if exists (processes where name is "Spotify") then
          tell application "Spotify"
            set trackName to name of current track
            set artistName to artist of current track
            set artworkUrl to artwork url of current track
            set isPlaying to (player state is playing)
            set trackPosition to player position
            set trackDuration to duration of current track
            set playerVolume to sound volume
            return trackName & "|||" & artistName & "|||" & artworkUrl & "|||" & isPlaying & "|||" & trackPosition & "|||" & trackDuration & "|||" & playerVolume
          end tell
        else
          return "not running"
        end if
      end tell
    `;
    
    const result = await execAppleScript(script);
    
    if (result === 'not running' || !result) {
      return null;
    }
    
    const parts = result.split('|||');
    if (parts.length >= 7) {
      return {
        title: parts[0] || undefined,
        artist: parts[1] || undefined,
        artwork: parts[2] || undefined,
        isPlaying: parts[3] === 'true',
        position: parseFloat(parts[4]) || 0,
        duration: parseFloat(parts[5]) || 0,
        volume: parseFloat(parts[6]) || 50
      };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getCurrentMediaFromMusic(): Promise<MediaInfo | null> {
  try {
    const script = `
      tell application "System Events"
        if exists (processes where name is "Music") then
          tell application "Music"
            if player state is playing then
              set trackName to name of current track
              set artistName to artist of current track
              return trackName & "|||" & artistName & "||||||true"
            else
              return "|||||||false"
            end if
          end tell
        else
          return "not running"
        end if
      end tell
    `;
    
    const result = await execAppleScript(script);
    
    if (result === 'not running' || !result) {
      return null;
    }
    
    const parts = result.split('|||');
    if (parts.length >= 4) {
      return {
        title: parts[0] || undefined,
        artist: parts[1] || undefined,
        isPlaying: parts[3] === 'true'
      };
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function getCurrentMedia(): Promise<MediaInfo | null> {
  // Try Spotify first, then Apple Music
  let media = await getCurrentMediaFromSpotify();
  if (!media) {
    media = await getCurrentMediaFromMusic();
  }
  return media;
}

// Media control functions
async function playPauseMedia(): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        if exists (processes where name is "Spotify") then
          tell application "Spotify"
            playpause
            return "success"
          end tell
        else if exists (processes where name is "Music") then
          tell application "Music"
            playpause
            return "success"
          end tell
        else
          return "no app"
        end if
      end tell
    `;
    
    const result = await execAppleScript(script);
    return result === 'success';
  } catch (error) {
    return false;
  }
}

async function nextTrack(): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        if exists (processes where name is "Spotify") then
          tell application "Spotify"
            next track
            return "success"
          end tell
        else if exists (processes where name is "Music") then
          tell application "Music"
            next track
            return "success"
          end tell
        else
          return "no app"
        end if
      end tell
    `;
    
    const result = await execAppleScript(script);
    return result === 'success';
  } catch (error) {
    return false;
  }
}

async function previousTrack(): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        if exists (processes where name is "Spotify") then
          tell application "Spotify"
            previous track
            return "success"
          end tell
        else if exists (processes where name is "Music") then
          tell application "Music"
            previous track
            return "success"
          end tell
        else
          return "no app"
        end if
      end tell
    `;
    
    const result = await execAppleScript(script);
    return result === 'success';
  } catch (error) {
    return false;
  }
}

async function setVolume(volume: number): Promise<boolean> {
  try {
    const script = `
      tell application "System Events"
        if exists (processes where name is "Spotify") then
          tell application "Spotify"
            set sound volume to ${Math.max(0, Math.min(100, volume))}
            return "success"
          end tell
        else if exists (processes where name is "Music") then
          tell application "Music"
            set sound volume to ${Math.max(0, Math.min(100, volume))}
            return "success"
          end tell
        else
          return "no app"
        end if
      end tell
    `;
    
    const result = await execAppleScript(script);
    return result === 'success';
  } catch (error) {
    return false;
  }
}

// IPC handlers
ipcMain.handle('get-current-media', async () => {
  return await getCurrentMedia();
});

ipcMain.handle('media-play-pause', async () => {
  return await playPauseMedia();
});

ipcMain.handle('media-next', async () => {
  return await nextTrack();
});

ipcMain.handle('media-previous', async () => {
  return await previousTrack();
});

ipcMain.handle('media-set-volume', async (_, volume: number) => {
  return await setVolume(volume);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
