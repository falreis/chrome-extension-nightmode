// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getBaseScript(){
  var base_script = "";

  var elements = ['h1','h2','h3','h4','h5','h6','div','span','p','td','tr','table'];
  for(i=0; i<elements.length; i++){
    base_script += "jQuery.each($('" + elements[i] +":visible'), function(index, item){ item.style.color= '{0}'; item.style.background = '{1}'; }); ";
  } 

  var code_script = "jQuery.each($('code:visible'), function(index, item){ item.style.color= '{2}'; item.style.background = '{1}'; }); ";
  var link_script = "jQuery.each($('a:visible'), function(index, item){ item.style.color= '{3}'; item.style.background = '{1}'; }); "
  var quote_script = "jQuery.each($('blockquote:visible'), function(index, item){ item.style.color= '{3}'; item.style.background = '{4}'; }); "

  return (base_script + code_script + link_script + quote_script);
}

function getCurrentTabDomain(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, (tabs) => {
    var tab = tabs[0];
    var url = tab.url;
    var domain = url.match(/^[\w-]+:\/{2,}\[?([\w\.:-]+)\]?(?::[0-9]*)?/)[0];
    console.assert(typeof url == 'string', 'tab.url should be a string');
    callback(domain);
  });
}

function replaceAll(str, needle, replacement) {
  return str.split(needle).join(replacement);
}

function enableBackgroundColor(tabId) {
  var multiline_script = getBaseScript().split('{0}').join('#FFF')
                                        .split('{1}').join('#000')
                                        .split('{2}').join('#00DD00')
                                        .split('{3}').join('#FFFF00')
                                        .split('{4}').join('#CCC')
  ;
  run(multiline_script, tabId);
}

function disableBackgroundColor(tabId) {
  var multiline_script = getBaseScript().split('{0}').join('')
                                        .split('{1}').join('')
                                        .split('{2}').join('')
                                        .split('{3}').join('')
                                        .split('{4}').join('')
  ;
  run(multiline_script, tabId);
}

function run(my_script, tabId){
  if(tabId){
    chrome.tabs.executeScript({ file: 'jquery-3.2.1.min.js'}, function() {chrome.tabs.executeScript(tabId, {code: my_script});});
  }
  else{
    chrome.tabs.executeScript({ file: 'jquery-3.2.1.min.js'}, function() {chrome.tabs.executeScript({code: my_script});});
  }
}

/**
 * Gets the saved background color for url.
 *
 * @param {string} url URL whose background color is to be retrieved.
 * @param {function(string)} callback called with the saved background color for
 *     the given url on success, or a falsy value if no color is retrieved.
 */
function getSavedBackgroundColor(url, callback) {
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
  // for chrome.runtime.lastError to ensure correctness even when the API call
  // fails.
  chrome.storage.sync.get(url, (items) => {
    callback(chrome.runtime.lastError ? null : items[url]);
  });
}

/**
 * Sets the given background color for url.
 *
 * @param {string} url URL for which background color is to be saved.
 * @param {string} color The background color to be saved.
 */
function saveBackgroundColor(url, color) {
  var items = {};
  items[url] = color;
  // See https://developer.chrome.com/apps/storage#type-StorageArea. We omit the
  // optional callback since we don't need to perform any action once the
  // background color is saved.
  chrome.storage.sync.set(items);
}

function Controller(url){
  var status = document.getElementById('status');

  getSavedBackgroundColor(url, (savedColor) => {
    if (savedColor) {
      status.innerHTML = savedColor;

      if(savedColor == "Enabled"){
        status.innerHTML = "Disabled";
        disableBackgroundColor();
      } else{
        status.innerHTML = "Enabled";
        enableBackgroundColor();
      }
    }
    else{
      enableBackgroundColor();
    }

    saveBackgroundColor(url, status.innerHTML);
  });
}

function AutomaticController(url, tabId){
  getSavedBackgroundColor(url, (savedColor) => {
    if (savedColor) {
      if(savedColor == "Enabled"){
        enableBackgroundColor(tabId);
      }
    }
  });
}

// This extension loads the saved background color for the current tab if one
// exists. The user can select a new background color from the dropdown for the
// current page, and it will be saved as part of the extension's isolated
// storage. The chrome.storage API is used for this purpose. This is different
// from the window.localStorage API, which is synchronous and stores data bound
// to a document's origin. Also, using chrome.storage.sync instead of
// chrome.storage.local allows the extension data to be synced across multiple
// user devices.

document.addEventListener('DOMContentLoaded', () => {
  getCurrentTabDomain((domain) => {
    Controller(domain);
  });
});

function myListener(tabId, changeInfo, tab ){ 
  if (changeInfo.status == "complete" ){
    chrome.tabs.query({'active': true}, function (tabs) {
      var domain = tabs[0].url.match(/^[\w-]+:\/{2,}\[?([\w\.:-]+)\]?(?::[0-9]*)?/)[0];
      AutomaticController(domain, tabId);
    });
  }
}

chrome.tabs.onUpdated.addListener(myListener);