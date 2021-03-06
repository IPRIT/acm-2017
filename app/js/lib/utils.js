import latinize from 'latinize';

var _logTimer = Date.now();
function dT () {
  return '[' + (((new Date()).getTime() - _logTimer) / 1000).toFixed(3) + ']';
}

function copyTextToClipboard (text, cb = () => {}) {
  function copyToClipboardFF (text) {
    window.prompt('Чтобы скопировать, нажмите: Ctrl+C, Enter', text);
  }

  (function copyToClipboard () {
    let success = true;
    let selection;
    const range = document.createRange();

    // For IE.
    if (window.clipboardData) {
      window.clipboardData.setData('Text', text);
    } else {
      // Create a temporary element off screen.
      const tmpElem = document.createElement('div');
      tmpElem.style.position = 'absolute';
      tmpElem.style.left = '-1000px';
      tmpElem.style.top = '-1000px';

      // Add the input value to the temp element.
      tmpElem.innerHTML = text;
      document.body.appendChild(tmpElem);

      // Select temp element.
      range.selectNodeContents(tmpElem);
      selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // Lets copy.
      try {
        success = document.execCommand('copy', false, null);
      } catch (e) {
        copyToClipboardFF(text);
      }
      if (success) {
        // remove temp element.
        tmpElem.remove();
        cb();
      }
    }
  })();
}

function checkClick (e, noprevent) {
  if (e.which == 1 && (e.ctrlKey || e.metaKey) || e.which == 2) {
    return true;
  }

  if (!noprevent) {
    e.preventDefault();
  }

  return false;
}

function extractQueryStringParams() {
  let queryString = location.href.split('?')[1] || '';
  if (!queryString) {
    return [];
  }
  return queryString.split('&').map(function (pair) {
    let values = pair.split('=');
    return {
      key: values[0],
      value: values[1]
    }
  });
}
function extractQueryStringParam(name) {
  let params = extractQueryStringParams();
  let param = params.find(function (param) {
    return param.key === name;
  });
  return param ? param.value : null;
}

function checkDragEvent(e) {
  if (!e || e.target && (e.target.tagName == 'IMG' || e.target.tagName == 'A')) return false;
  if (e.dataTransfer && e.dataTransfer.types) {
    for (var i = 0; i < e.dataTransfer.types.length; i++) {
      if (e.dataTransfer.types[i] == 'Files') {
        return true;
      }
    }
  } else {
    return true;
  }

  return false;
}

function cancelEvent (event) {
  event = event || window.event;
  if (event) {
    event = event.originalEvent || event;

    if (event.stopPropagation) event.stopPropagation();
    if (event.preventDefault) event.preventDefault();
  }

  return false;
}

function onCtrlEnter (textarea, cb) {
  $(textarea).on('keydown', function (e) {
    if (e.keyCode == 13 && (e.ctrlKey || e.metaKey)) {
      cb();
      return cancelEvent(e);
    }
  });
}

function setFieldSelection(field, from, to) {
  field = $(field)[0];
  try {
    field.focus();
    if (from === undefined || from === false) {
      from = field.value.length;
    }
    if (to === undefined || to === false) {
      to = from;
    }
    if (field.createTextRange) {
      var range = field.createTextRange();
      range.collapse(true);
      range.moveEnd('character', to);
      range.moveStart('character', from);
      range.select();
    }
    else if (field.setSelectionRange) {
      field.setSelectionRange(from, to);
    }
  } catch(e) {}
}

function getFieldSelection (field) {
  if (field.selectionStart) {
    return field.selectionStart;
  }
  else if (!document.selection) {
    return 0;
  }

  var c = "\r",
    sel = document.selection.createRange(),
    txt = sel.text,
    dup = sel.duplicate(),
    len = 0;

  try {
    dup.moveToElementText(field);
  } catch(e) {
    return 0;
  }

  sel.text = txt + c;
  len = dup.text.indexOf(c);
  sel.moveStart('character', -1);
  sel.text  = '';

  return len;
}

function getRichValue(field) {
  if (!field) {
    return '';
  }
  var lines = [];
  var line = [];

  getRichElementValue(field, lines, line);
  if (line.length) {
    lines.push(line.join(''));
  }

  return lines.join('\n');
}

function getRichValueWithCaret(field) {
  if (!field) {
    return [];
  }
  var lines = [];
  var line = [];

  var sel = window.getSelection ? window.getSelection() : false;
  var selNode, selOffset;
  if (sel && sel.rangeCount) {
    var range = sel.getRangeAt(0);
    if (range.startContainer &&
      range.startContainer == range.endContainer &&
      range.startOffset == range.endOffset) {
      selNode = range.startContainer;
      selOffset = range.startOffset;
    }
  }

  getRichElementValue(field, lines, line, selNode, selOffset);

  if (line.length) {
    lines.push(line.join(''));
  }

  var value = lines.join('\n');
  var caretPos = value.indexOf('\r');
  if (caretPos != -1) {
    value = value.substr(0, caretPos) + value.substr(caretPos + 1);
  }

  return [value, caretPos];
}

function getRichElementValue(node, lines, line, selNode, selOffset) {
  if (node.nodeType == 3) { // TEXT
    if (selNode === node) {
      var value = node.nodeValue;
      line.push(value.substr(0, selOffset) + '\r' + value.substr(selOffset));
    } else {
      line.push(node.nodeValue);
    }
    return;
  }
  if (node.nodeType != 1) { // NON-ELEMENT
    return;
  }
  var isBlock = node.tagName == 'DIV' || node.tagName == 'P';
  var curChild;
  if (isBlock && line.length || node.tagName == 'BR') {
    lines.push(line.join(''));
    line.splice(0, line.length);
  }
  else if (node.tagName == 'IMG') {
    if (node.alt) {
      line.push(node.alt);
    }
  }
  if (selNode === node) {
    line.push('\r');
  }
  var curChild = node.firstChild;
  while (curChild) {
    getRichElementValue(curChild, lines, line, selNode, selOffset);
    curChild = curChild.nextSibling;
  }
  if (isBlock && line.length) {
    lines.push(line.join(''));
    line.splice(0, line.length);
  }
}

function setRichFocus(field, selectNode) {
  field.focus();
  if (window.getSelection && document.createRange) {
    var range = document.createRange();
    if (selectNode) {
      range.selectNode(selectNode);
    } else {
      range.selectNodeContents(field);
    }
    range.collapse(false);

    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  else if (document.body.createTextRange !== undefined) {
    var textRange = document.body.createTextRange();
    textRange.moveToElementText(selectNode || field);
    textRange.collapse(false);
    textRange.select();
  }
}

function onContentLoaded (cb) {
  setZeroTimeout(cb);
}

function tsNow (seconds) {
  var t = +new Date() + (window.tsOffset || 0);
  return seconds ? Math.floor(t / 1000) : t;
}

function safeApply(scope, fn) {
  if (!scope) {
    return;
  }
  var phase = scope.$root && scope.$root.$$phase;
  if (phase && ['$apply', '$digest'].indexOf(phase) >= 0) {
    if (fn && typeof fn === 'function') {
      scope.$eval(fn);
    }
  } else {
    if (fn && typeof fn === 'function') {
      scope.$apply(fn);
    } else {
      scope.$apply();
    }
  }
}

function safeReplaceObject (wasObject, newObject) {
  for (var key in wasObject) {
    if (!newObject.hasOwnProperty(key) && key.charAt(0) != '$') {
      delete wasObject[key];
    }
  }
  for (var key in newObject) {
    if (newObject.hasOwnProperty(key)) {
      wasObject[key] = newObject[key];
    }
  }
}

function listMergeSorted (list1, list2) {
  list1 = list1 || [];
  list2 = list2 || [];

  var result = angular.copy(list1);

  var minID = list1.length ? list1[list1.length - 1] : 0xFFFFFFFF;
  for (var i = 0; i < list2.length; i++) {
    if (list2[i] < minID) {
      result.push(list2[i]);
    }
  }

  return result;
}

function listUniqSorted (list) {
  list = list || [];
  var resultList = [],
    prev = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i] !== prev) {
      resultList.push(list[i])
    }
    prev = list[i];
  }

  return resultList;
}

function templateUrl (prefix, tplName) {
  var templateUrlPart = 'partials/' + prefix + '/' + tplName + '.html';
  console.log(templateUrlPart);
  return templateUrlPart;
}

function encodeEntities(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function calcImageInBox(imageW, imageH, boxW, boxH, noZooom) {
  var boxedImageW = boxW;
  var boxedImageH = boxH;

  if ((imageW / imageH) > (boxW / boxH)) {
    boxedImageH = parseInt(imageH * boxW / imageW);
  }
  else {
    boxedImageW = parseInt(imageW * boxH / imageH);
    if (boxedImageW > boxW) {
      boxedImageH = parseInt(boxedImageH * boxW / boxedImageW);
      boxedImageW = boxW;
    }
  }

  if (noZooom && boxedImageW >= imageW && boxedImageH >= imageH) {
    boxedImageW = imageW;
    boxedImageH = imageH;
  }

  return {w: boxedImageW, h: boxedImageH};
}

function versionCompare (ver1, ver2) {
  if (typeof ver1 !== 'string') {
    ver1 = '';
  }
  if (typeof ver2 !== 'string') {
    ver2 = '';
  }
  ver1 = ver1.replace(/^\s+|\s+$/g, '').split('.');
  ver2 = ver2.replace(/^\s+|\s+$/g, '').split('.');

  var a = Math.max(ver1.length, ver2.length), i;

  for (i = 0; i < a; i++) {
    if (ver1[i] == ver2[i]) {
      continue;
    }
    if (ver1[i] > ver2[i]) {
      return 1;
    } else {
      return -1;
    }
  }

  return 0;
}

/*!
 * Search engine from
 * Webogram v0.4.0 - messaging web application for MTProto
 * https://github.com/zhukov/webogram
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * https://github.com/zhukov/webogram/blob/master/LICENSE
 */
(function (global) {
  var badCharsRe = /[`~!@#$%^&*()\-_=+\[\]\\|{}'";:\/?.>,<\s]+/g,
    trimRe = /^\s+|\s$/g;

  function createIndex () {
    return {
      shortIndexes: {},
      fullTexts: {}
    }
  }

  function cleanSearchText (text) {
    var hasTag = text.charAt(0) == '%';
    text = text.replace(badCharsRe, ' ').replace(trimRe, '');
    // text = latinize(text);
    text = text.toLowerCase();
    if (hasTag) {
      text = '%' + text
    }

    return text
  }

  function indexObject (id, searchText, searchIndex) {
    if (searchIndex.fullTexts[id] !== undefined) {
      return false
    }

    searchText = cleanSearchText(searchText);

    if (!searchText.length) {
      return false
    }

    var shortIndexes = searchIndex.shortIndexes;

    searchIndex.fullTexts[id] = searchText;

    angular.forEach(searchText.split(' '), function (searchWord) {
      var len = Math.min(searchWord.length, 3),
        wordPart, i;
      for (i = 1; i <= len; i++) {
        wordPart = searchWord.substr(0, i);
        if (shortIndexes[wordPart] === undefined) {
          shortIndexes[wordPart] = [id]
        } else {
          shortIndexes[wordPart].push(id)
        }
      }
    })
  }

  function search (query, searchIndex) {
    var shortIndexes = searchIndex.shortIndexes;
    var fullTexts = searchIndex.fullTexts;

    query = cleanSearchText(query);

    var queryWords = query.split(' ');
    var foundObjs = false,
      newFoundObjs, i;
    var j, searchText;
    var found;

    for (i = 0; i < queryWords.length; i++) {
      newFoundObjs = shortIndexes[queryWords[i].substr(0, 3)];
      if (!newFoundObjs) {
        foundObjs = [];
        break
      }
      if (foundObjs === false || foundObjs.length > newFoundObjs.length) {
        foundObjs = newFoundObjs
      }
    }

    newFoundObjs = {};

    for (j = 0; j < foundObjs.length; j++) {
      found = true;
      searchText = fullTexts[foundObjs[j]];
      for (i = 0; i < queryWords.length; i++) {
        if (searchText.indexOf(queryWords[i]) == -1) {
          found = false;
          break
        }
      }
      if (found) {
        newFoundObjs[foundObjs[j]] = true
      }
    }

    return newFoundObjs
  }

  global.SearchIndexManager = {
    createIndex: createIndex,
    indexObject: indexObject,
    cleanSearchText: cleanSearchText,
    search: search
  }
})(window);

var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i;
var youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?youtu(?:|\.be|be\.com|\.b)(?:\/v\/|\/watch\\?v=|e\/|(?:\/\??#)?\/watch(?:.+)v=)(.{11})(?:\&[^\s]*)?/;
var vimeoRegex = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i;
var instagramRegex = /^https?:\/\/(?:instagr\.am\/p\/|instagram\.com\/p\/)([a-zA-Z0-9\-\_]+)/i;
var vineRegex = /^https?:\/\/vine\.co\/v\/([a-zA-Z0-9\-\_]+)/i;
var twitterRegex = /^https?:\/\/twitter\.com\/.+?\/status\/\d+/i;
var facebookRegex = /^https?:\/\/(?:www\.)?facebook\.com\/.+?\/posts\/\d+/i;
var gplusRegex = /^https?:\/\/plus\.google\.com\/\d+\/posts\/[a-zA-Z0-9\-\_]+/i;
var soundcloudRegex = /^https?:\/\/(?:soundcloud\.com|snd\.sc)\/([a-zA-Z0-9%\-\_]+)\/([a-zA-Z0-9%\-\_]+)/i;
var phoneRegex = /^\+?[0-9]{1,3}\s?([0-9]{1,3})?\s?\(?[0-9]{3}\)?(\s)?[0-9]{3}(\s|\-)?[0-9]{2}(\s|\-)?[0-9]{2}$/;
