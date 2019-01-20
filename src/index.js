import {
  refreshLinks,
  setMenuItems,
  toggleAutoRefresh,
  toggleDisplayFolderLinks,
  toggleRepeatFolders,
  allFoldersHandler,
  folderPicked,
  generateLinks,
  processRemoveFolder,
  resetCustomFolders,
  showPicker,
  showPrompt,
  showRemoveFolderPrompt
} from './core';
import { getOAuthToken } from './utils';

global.refreshLinks = refreshLinks;

/**
 * Simple trigger that runs on sheet open.
 */
global.onOpen = event => {
  try {
    setMenuItems(event);
  } catch (e) {
    Logger.log(e);
  }
};

/**
 * Simple trigger that runs upon addon installation.
 */
global.onInstall = e => {
  global.onOpen(e);
};

global.toggleAutoRefresh = toggleAutoRefresh;
global.toggleDisplayFolderLinks = toggleDisplayFolderLinks;
global.toggleRepeatFolders = toggleRepeatFolders;

global.getOAuthToken = getOAuthToken;

global.allFoldersHandler = allFoldersHandler;
global.folderPicked = folderPicked;
global.generateLinks = generateLinks;
global.processRemoveFolder = processRemoveFolder;
global.resetCustomFolders = resetCustomFolders;
global.showPicker = showPicker;
global.showPrompt = showPrompt;
global.showRemoveFolderPrompt = showRemoveFolderPrompt;
