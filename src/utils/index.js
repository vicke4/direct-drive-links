/**
 * Function that gets the property of the document.
 *
 * @param {String} key to be used get the property of the document.
 * @param {String} type to be used get the type of property.
 * valid types - user, script, document
 * @param {String} data type of the property, possible values: json, bool, string.
 * @param {String} action to be performed, get/set of the property.
 * @param {String} value if action === 'set', value to be set.
 * @return {String} if action === 'get' else null;
 */
export const getSetProperty = (key, type, dataType, action, value) => {
  let properties;
  let val;

  if (type === 'user') {
    properties = PropertiesService.getUserProperties();
  } else if (type === 'script') {
    properties = PropertiesService.getScriptProperties();
  } else {
    properties = PropertiesService.getDocumentProperties();
  }

  if (action === 'set') {
    properties.setProperty(key, dataType === 'json' ? JSON.stringify(value) : value);
  } else {
    const propertyValue = properties.getProperty(key);
    if (!propertyValue) return null;

    if (dataType === 'json') val = JSON.parse(propertyValue);
    else if (dataType === 'bool') val = propertyValue === 'true';
    else val = propertyValue;
  }

  return val;
};

export const getHTMLTemplate = (type, sharedWithMe, folderList) => {
  const t = HtmlService.createTemplateFromFile(type);
  let height = 75;
  let width = 300;

  if (type === 'folderPicker') {
    height = 400;
    width = 600;
  }

  if (type === 'folderList') {
    height = 280;
    width = 400;
  }

  if (type === 'removeFolder') {
    height = 95;
    width = 250;
  }

  t.sharedWithMe = sharedWithMe;
  t.folderList = folderList;
  return t
    .evaluate()
    .setWidth(width)
    .setHeight(height);
};

export const getOAuthToken = () => ScriptApp.getOAuthToken();
