import { buildData, getFolderPath, init } from './index';
import { getSetProperty, getHTMLTemplate } from '../utils';

const showFolderList = (customFolderListt, includeSharedWithMe) => {
  const customFolderList =
    customFolderListt || getSetProperty('customFolderList', 'user', 'json', 'get');
  SpreadsheetApp.getUi().showModalDialog(
    getHTMLTemplate('folderList', includeSharedWithMe, customFolderList),
    'Direct link folders'
  );
};

const showPicker = (includeSharedWithMe, considerList) => {
  if (considerList) {
    const customFolderList = getSetProperty('customFolderList', 'user', 'json', 'get');
    if (customFolderList) return showFolderList(customFolderList, includeSharedWithMe);
  }

  return SpreadsheetApp.getUi().showModalDialog(
    getHTMLTemplate('folderPicker', includeSharedWithMe),
    'Pick the folders for generating links'
  );
};

const showPrompt = () => {
  SpreadsheetApp.getUi().showModalDialog(
    getHTMLTemplate('selectFolderPrompt'),
    'You want direct links to the files in?'
  );
};

const showRemoveFolderPrompt = () => {
  SpreadsheetApp.getUi().showModalDialog(
    getHTMLTemplate(
      'removeFolder',
      null,
      getSetProperty('customFolderList', 'user', 'json', 'get')
    ),
    'Choose a folder to remove'
  );
};

const allFoldersHandler = sharedWithMe => {
  getSetProperty('sharedWithMe', 'user', 'bool', 'set', sharedWithMe);
  getSetProperty('allFolders', 'user', 'bool', 'set', true);
  init();
};

const generateLinks = (recursivePick, sharedWithMe) => {
  getSetProperty('allFolders', 'user', 'bool', 'set', false);
  getSetProperty('sharedWithMe', 'user', 'bool', 'set', sharedWithMe);
  getSetProperty('recursivePick', 'user', 'bool', 'set', recursivePick);
  init();
};

const folderPicked = (folderList, onlyMe) => {
  let customFolderList = getSetProperty('customFolderList', 'user', 'json', 'get');

  getSetProperty('sharedWithMe', 'user', 'bool', 'set', !onlyMe);
  getSetProperty('allFolders', 'user', 'bool', 'set', false);

  buildData('folderMap', 'items(id,title,ownedByMe,parents(id,isRoot))', onlyMe);

  if (!customFolderList || Object.keys(customFolderList).length === 0) {
    customFolderList = {};
  }

  folderList.forEach(folderObj => {
    customFolderList[folderObj.id] = getFolderPath(folderObj);
  });

  getSetProperty('customFolderList', 'user', 'json', 'set', customFolderList);
  showFolderList(customFolderList);
};

const processRemoveFolder = folderId => {
  const customFolderList = getSetProperty('customFolderList', 'user', 'json', 'get');
  delete customFolderList[folderId];
  getSetProperty('customFolderList', 'user', 'json', 'set', customFolderList);
  showFolderList(customFolderList);
};

const resetCustomFolders = () => {
  const up = PropertiesService.getUserProperties();
  up.deleteProperty('customFolderList');
  showPrompt();
};

export {
  allFoldersHandler,
  folderPicked,
  generateLinks,
  processRemoveFolder,
  resetCustomFolders,
  showPicker,
  showRemoveFolderPrompt
};
