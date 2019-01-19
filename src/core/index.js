import { getProperty, getSetProperty } from '../utils';

// Definition of the variables that holds information
// about the user's Drive
const folderIdMapping = {};
const parentChildrenMapping = {};
const driveObj = {
  'My Drive': {
    files: [],
    path: 'My Drive > '
  }
};

/**
 * A Function that builds the folder id to title
 * mapping. Keys will be folder ids and the values
 * will be folder titles.
 *
 * @param {Object} fileObj contains info about the folder.
 */

const buildFolderIdMapping = fileObj => {
  if (!folderIdMapping[fileObj.id]) {
    const { parents } = fileObj;

    folderIdMapping[fileObj.id] = {
      title: fileObj.title,
      parentId: parents.length > 0 ? parents[0].id : null,
      ownedByMe: fileObj.ownedByMe
    };

    if (parents.length > 0) {
      parents.forEach(parentObj => {
        if (parentChildrenMapping[parentObj.id]) {
          parentChildrenMapping[parentObj.id].push(fileObj.id);
        } else {
          parentChildrenMapping[parentObj.id] = [fileObj.id];
        }
      });
    }
  }
};

/**
 * Function that returns the path of the folder from
 * My Drive.
 *
 * @param {Object} fileObj contains info about the file.
 */
const getFolderPath = fileObj => {
  let firstParentObj = folderIdMapping[fileObj.folderId || fileObj.id];
  const isOwner = fileObj.owner || (firstParentObj && firstParentObj.ownedByMe);
  const folderProp = isOwner ? 'My Drive > ' : 'Shared with me > ';
  let folderPath = firstParentObj ? firstParentObj.title : folderProp;
  let parentObj = null;

  while (folderPath !== folderProp) {
    parentObj = folderIdMapping[firstParentObj.parentId];

    if (!parentObj) {
      folderPath = `${folderProp + folderPath} >`;
      return folderPath;
    }

    folderPath = `${parentObj.title} > ${folderPath}`;
    firstParentObj = parentObj;
  }

  return folderPath;
};

/**
 * Function that returns the folders of a file.
 *
 * @param {Array} parentsArr Array of parent(folder) objects.
 * @return {Array} Array of folder names.
 */
const findParents = parentsArr => {
  const parentObj = [];

  parentsArr.forEach(p => {
    if (!p.isRoot) {
      parentObj.push({
        root: false,
        folderId: p.id,
        folderName: folderIdMapping[p.id] ? folderIdMapping[p.id].title : ''
      });
    } else {
      parentObj.push({
        root: true,
        folderId: p.id,
        folderName: 'My Drive'
      });
    }
  });

  parentObj.forEach(p => {
    const key = `${p.folderName}$GaN#!${p.folderId}`;

    if (!driveObj[key]) {
      driveObj[key] = {
        files: [],
        path: getFolderPath({ id: p.folderId, owner: p.root })
      };
    }
  });

  return parentObj;
};

/**
 * Function that returns the access details of a file.
 *
 * @param {Object} fileObj contains info about the file.
 * @return {String} share info of the file.
 */
const getAccessDetails = fileObj => {
  if (
    fileObj.permissionIds.indexOf('anyoneWithLink') !== -1 ||
    fileObj.permissionIds.indexOf('anyone') !== -1
  ) {
    return 'Anybody with the link';
  }
  if (fileObj.permissionIds.length === 1) {
    return 'Not Shared with anyone';
  }

  const { restricted } = fileObj.labels;
  const ownerPermissionId = fileObj.owners[0].permissionId;
  const sharedUsers = [];

  // if the file access is restricted only writers will be
  // able to make use of direct links
  fileObj.permissions.forEach(p => {
    if (p.id !== ownerPermissionId) {
      if (!restricted) {
        sharedUsers.push(p.emailAddress);
      } else if (p.role === 'writer') {
        sharedUsers.push(p.emailAddress);
      }
    }
  });

  return sharedUsers.join();
};

/**
 * A function that returns the direct link of a file.
 *
 * @param {Object} fileObj contains info about the file.
 * @return {String} Direct link of the file.
 */
const getLink = fileObj => {
  let link;
  let docType;

  const docMimeTypes = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation'
  ];
  const docIndex = docMimeTypes.indexOf(fileObj.mimeType);

  if (docIndex > -1) {
    if (docIndex === 0) docType = 'document';
    else if (docIndex === 1) docType = 'spreadsheets';
    else docType = 'presentation';

    link = `https://docs.google.com/${docType}/d/${fileObj.id}${
      docIndex === 2 ? '/export/pdf' : '/export?format=pdf'
    }`;
  } else {
    link = fileObj.webContentLink;
  }

  return link || 'Not applicable';
};

/**
 * Function that builds data that will later be populated
 * on the sheet.
 *
 * @param {Object} fileObj contains info about the file.
 */
const buildDriveObj = fileObj => {
  const pushObj = {
    id: fileObj.id,
    name: fileObj.title,
    owner: fileObj.ownedByMe,
    link: getLink(fileObj),
    access: getAccessDetails(fileObj)
  };

  const parentsArr = findParents(fileObj.parents);
  let driveObjKey;
  // File obj is pushed to all of the parent folder keys
  parentsArr.forEach(p => {
    pushObj.folderId = p.folderId;
    driveObjKey = `${p.folderName}$GaN#!${p.folderId}`;
    driveObj[driveObjKey].files.push(pushObj);
  });
};

/**
 * Function that queries drive and retrives data.
 *
 * @param {String} query to use it on Drive API.
 * @param {String} fileds to be returned.
 */
const getFiles = (query, fields, type) => {
  let files;
  let pageToken;
  do {
    files = Drive.Files.list({
      q: query,
      maxResults: 100,
      pageToken,
      fields: `${fields},nextPageToken`
    });

    if (files.items && files.items.length > 0) {
      for (let i = 0; i < files.items.length; i += 1) {
        const fileObj = files.items[i];

        // Pushes to the file to driveObj or builds
        // folderIdMapping
        if (type === 'folderMap') {
          buildFolderIdMapping(fileObj);
        } else {
          buildDriveObj(fileObj);
        }
      }
    } else {
      const ui = SpreadsheetApp.getUi();

      if (type !== 'folderMap') {
        ui.alert(
          `
            No files found on your Google Drive
            add some files and try again
          `
        );
      }
    }
    pageToken = files.nextPageToken;
  } while (pageToken);
};

const prepareForRecursion = (recursiveCustomFolder, customFolderList) => {
  const folderIdList = Object.keys(customFolderList);

  folderIdList.forEach(folderId => {
    recursiveCustomFolder[folderId] = getFolderPath({ id: folderId });

    if (parentChildrenMapping[folderId] && parentChildrenMapping[folderId].length > 0) {
      const tempCustomFolderList = {};

      parentChildrenMapping[folderId].forEach(childrenId => {
        tempCustomFolderList[childrenId] = '';
      });

      prepareForRecursion(recursiveCustomFolder, tempCustomFolderList);
    }
  });

  return recursiveCustomFolder;
};

const getCustomFolderQuery = (queryy, customFolderListt) => {
  let query = queryy;
  let customFolderList = customFolderListt;

  const recursivePick = getSetProperty('recursivePick', 'user', 'bool');
  query += ' and (';

  if (recursivePick) customFolderList = prepareForRecursion({}, customFolderList);

  const sorted = Object.keys(customFolderList).sort((a, b) =>
    customFolderList[a].localeCompare(customFolderList[b])
  );

  sorted.forEach((folderId, index) => {
    if (index !== 0) query += ' or ';
    query += `"${folderId}" in parents`;
  });

  query += ')';

  return query;
};

/**
 * Entry point where data construction begins.
 *
 * @param {String} type of the data to be retrieved from Drive.
 * @param {String} fileds to be returned.
 */
const buildData = (type, fields, ownedByMe) => {
  let query = 'trashed = false';

  if (ownedByMe || !getSetProperty('sharedWithMe', 'user', 'bool')) {
    query += ' and "me" in owners';
  }

  if (type === 'driveObj' && !getSetProperty('allFolders', 'user', 'bool')) {
    const customFolderList = getSetProperty('customFolderList', 'user', 'json', 'get');

    if (customFolderList) {
      query = getCustomFolderQuery(query, customFolderList);
    }
  }
  //  query += ' and ("0B0k76GMavVymeWxmTzR2UEtCR0E" in parents or "0B0k76GMavVymS2FabVlxSjRNQ0U" in parents)';
  query += ' and mimeType';
  query += type === 'folderMap' ? '=' : '!=';
  query += '"application/vnd.google-apps.folder"';

  getFiles(query, fields, type);
};

/**
 * A function that builds the data to be passed to Sheets API.
 *
 * @return {Object} used on Sheets API.
 */
const getSheetRows = displayFolderLinks => {
  const folders = Object.keys(driveObj).sort((a, b) =>
    driveObj[a].path.localeCompare(driveObj[b].path)
  );
  const rows = [];
  const backgroundColors = [];
  // let folder;
  let firstFolderLink;
  let firstFolderNameLink;
  let firstFolderPath;
  let bgColorTemp;
  const repeatFolderNames = getProperty('repeatFolders');
  const locale = Session.getActiveUserLocale().toLowerCase();
  let hyperlinkSeparator =
    ['de', 'es', 'it', 'nl', 'pl', 'pt', 'pt-PT', 'pt-br', 'tr', 'ru', 'vi'].indexOf(locale) === -1
      ? ','
      : ';';
  hyperlinkSeparator = ';'; // Hardcoding as it may fix all language specific problems
  folders.forEach((folderKey, index) => {
    const [folder] = folderKey.split('$GaN#!');

    driveObj[folderKey].files.forEach((fileObj, oIndex) => {
      let folderNameLink = '';
      let folderPath = '';
      let folderLink = '';

      if (oIndex === 0) {
        firstFolderLink = `https://drive.google.com/drive/u/0/folders/${fileObj.folderId}`;
        firstFolderNameLink = `=hyperlink("${firstFolderLink}"${hyperlinkSeparator}"${folder}")`;
        //        firstFolderPath = getFolderPath(fileObj);
        firstFolderPath = driveObj[folderKey].path;
      }

      if (repeatFolderNames === 'true' || oIndex === 0) {
        folderPath = firstFolderPath;
        folderLink = firstFolderLink;
        folderNameLink = firstFolderNameLink;
      }

      // color coding to differeniate files of different folders
      if (index % 2 === 0) {
        bgColorTemp = ['#fff', '#fff'];
        if (displayFolderLinks) bgColorTemp.push('#fff');
        bgColorTemp.push('#fff', '#fff', '#fff');
        backgroundColors.push(bgColorTemp);
      } else {
        bgColorTemp = ['#ddd', '#ddd'];
        if (displayFolderLinks) bgColorTemp.push('#ddd');
        bgColorTemp.push('#ddd', '#ddd', '#ddd');
        backgroundColors.push(bgColorTemp);
      }

      //      var previewLink = '=hyperlink("https://drive.google.com/file/d/'
      //                     + fileObj.id + '/edit", "' + fileObj.name + '")'
      const previewLink = `=hyperlink("https://drive.google.com/file/d/${
        fileObj.id
      }/edit"${hyperlinkSeparator}"${fileObj.name}")`;

      // Actual usable row data
      const rowTemp = [folderNameLink, folderPath];

      if (displayFolderLinks) rowTemp.push(folderLink);

      rowTemp.push(previewLink, fileObj.link, fileObj.access);
      rows.push(rowTemp);
    });
  });

  return {
    rows,
    backgrounds: backgroundColors
  };
};

/**
 * A function that writes header to the sheet.
 */
const writeHeader = (sheet, displayFolderLinks) => {
  const headerTemp = ['Folder', 'Folder Path'];

  if (displayFolderLinks) headerTemp.push('Folder Link');
  headerTemp.push('File', 'Direct Link', 'Shared With');

  // Sheet formatting
  const header = [headerTemp];
  sheet.getRange(1, 1, 1, displayFolderLinks ? 6 : 5).setValues(header);
  sheet.setColumnWidth(1, 125);
  sheet.setColumnWidth(2, 275);
  sheet.setColumnWidth(3, displayFolderLinks ? 150 : 300);
  sheet.setColumnWidth(4, displayFolderLinks ? 300 : 150);
  sheet.setColumnWidth(5, displayFolderLinks ? 150 : 325);
  sheet.setColumnWidth(6, displayFolderLinks ? 325 : 100);
  sheet.setFrozenRows(1);
  sheet
    .getRange(`A1:${displayFolderLinks ? 'F1' : 'E1'}`)
    .setBackground('#00FF00')
    .setFontWeight('bold');
};

/**
 * A function that writes to sheet.
 */
const writeToSpreadSheet = resetHeaders => {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheetName = 'Drive Direct Links';
  const displayFolderLinks = getSetProperty('displayFolderLinks', 'document', 'bool');
  let sheet = spreadsheet.getSheetByName(sheetName);
  const valueObj = getSheetRows(displayFolderLinks);
  const { rows } = valueObj;

  // if the length of rows is 0, there is no file on Drive.
  if (rows.length === 0) {
    return;
  }

  // if the sheet is already available clears and activates, else
  // creates one.
  if (sheet) {
    sheet.getRange(resetHeaders ? 1 : 2, 1, sheet.getMaxRows(), 6).clear();
    sheet.activate();
  } else {
    sheet = spreadsheet.insertSheet(sheetName);
    writeHeader(sheet, displayFolderLinks);
    sheet.deleteColumns(6, sheet.getMaxColumns() - 6);
  }

  if (resetHeaders) writeHeader(sheet, displayFolderLinks);

  // Pushing data
  sheet
    .getRange(2, 1, rows.length, displayFolderLinks ? 6 : 5)
    .setValues(rows)
    .setBackgrounds(valueObj.backgrounds);
  sheet
    .getRange(2, 1, rows.length, displayFolderLinks ? 2 : 3)
    .setFontColor('black')
    .setFontLine('none');

  if (displayFolderLinks) {
    sheet
      .getRange(2, 4, rows.length, 1)
      .setFontColor('black')
      .setFontLine('none');
  }
};

/**
 * Function that sets the addon menu.
 *
 * @param {Object} e event object with authentication info.
 */
const setMenuItems = e => {
  const menu = SpreadsheetApp.getUi().createAddonMenu();
  let used = null;
  let autoRefresh;
  let repeatFolders;
  let displayFolderLinks;

  if (e && e.authMode !== ScriptApp.AuthMode.NONE) {
    autoRefresh = getSetProperty('autoRefresh', 'document', 'bool');
    repeatFolders = getSetProperty('repeatFolders', 'document', 'bool');
    displayFolderLinks = getSetProperty('displayFolderLinks', 'document', 'bool');
    used = getProperty('installed');
  }

  const menuObj = [
    {
      name: used ? 'Refresh Links' : 'Generate Links',
      functionName: used ? 'refreshLinks' : 'showPrompt',
      installed: true
    }
  ];

  if (used) {
    menuObj.push(
      { name: 'Select folders for links', functionName: 'showPrompt' },
      null,
      {
        name: 'Autorefresh on open',
        functionName: 'toggleAutoRefresh',
        installed: false,
        propertyKey: autoRefresh
      },
      {
        name: 'Display folder links',
        functionName: 'toggleDisplayFolderLinks',
        installed: false,
        propertyKey: displayFolderLinks
      },
      {
        name: 'Repeat folder names',
        functionName: 'toggleRepeatFolders',
        installed: false,
        propertyKey: repeatFolders
      }
    );
  }

  menuObj.forEach(mObj => {
    if (!mObj) {
      menu.addSeparator();
    } else {
      if (mObj.propertyKey) {
        mObj.name = `✓ ${mObj.name}`;
      }

      menu.addItem(mObj.name, mObj.functionName);
    }
  });

  menu.addToUi();
};

/**
 * Function that toggles the given properties key.
 *
 * @param {String} key properies key to be set or unset.
 * @return {Boolean}
 */
const toggle = key => {
  const documentProperties = PropertiesService.getDocumentProperties();
  const value = documentProperties.getProperty(key) !== 'true';
  documentProperties.setProperty(key, value);

  setMenuItems({
    authMode: ScriptApp.AuthMode.LIMITED
  });

  return value;
};

/**
 * Function that toggles autorefresh functionality of the addon
 * on sheet open.
 */
const toggleAutoRefresh = () => {
  // Deletes or sets installable trigger to call init() on open
  if (toggle('autoRefresh')) {
    const spreadsheet = SpreadsheetApp.getActive();
    ScriptApp.newTrigger('init')
      .forSpreadsheet(spreadsheet.getId())
      .onOpen()
      .create();
  } else {
    ScriptApp.getProjectTriggers().forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
    });
  }
};

/**
 * Entry point of all other operations
 *
 * @param {Boolean} fromTrigger just to know if it is called by a trigger
 * or by other functions.
 */
const init = (fromTrigger, resetHeaders) => {
  const cache = CacheService.getUserCache();

  // Returns if called by trigger and the 6h cache is not expired
  if (fromTrigger && cache.get('directLinkKey')) {
    return;
  }

  // 6h cache to not refresh links sheet frequently on open
  cache.put('directLinkKey', true, 21600);

  buildData('folderMap', 'items(id,title,ownedByMe,parents(id,isRoot))');
  buildData(
    'driveObj',
    `
      items(id,labels/restricted,ownedByMe,owners(emailAddress,permissionId),
      mimeType,parents(id,isRoot),permissionIds,
      permissions(emailAddress,id,role),title,webContentLink)
    `
  );
  writeToSpreadSheet(resetHeaders);

  // Sets autorefresh trigger on install of addon
  if (!getProperty('installed')) {
    toggle('installed');
    toggleAutoRefresh();
    setMenuItems({
      authMode: ScriptApp.AuthMode.LIMITED
    });
  }
};

/**
 * Function that generates or refreshes the data on sheet.
 */
const refreshLinks = () => {
  try {
    init(false);
  } catch (e) {
    const ui = SpreadsheetApp.getUi();
    Logger.log(e);
    const error = `
      Something went wrong while generating links.
      Please let us know using the help section of
      this Add-on,\n\nAdd-ons → Direct Drive Links → Help.\n\n
      Error reported,\n %s
    `;
    const alertText = Utilities.formatString(error, e);

    ui.alert(alertText);
  }
};

/**
 * Function that toggles the repeat folders which repeats
 * the folder name and path in column 2 & 3 respectively.
 */
const toggleRepeatFolders = () => {
  toggle('repeatFolders');
  init(false);
};

/**
 * Function that toggles the display folder links which
 * displays folder links on 3rd column.
 */
const toggleDisplayFolderLinks = () => {
  toggle('displayFolderLinks');
  init(false, true);
  setMenuItems({ authmode: ScriptApp.AuthMode.FULL });
};

export {
  buildData,
  getFolderPath,
  init,
  refreshLinks,
  setMenuItems,
  toggleAutoRefresh,
  toggleDisplayFolderLinks,
  toggleRepeatFolders
};
export * from './picker';
