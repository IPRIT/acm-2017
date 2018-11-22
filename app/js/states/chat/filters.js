/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 25.02.2018
 */

"use strict";

angular.module('Qemy.filters.chat', [
  'Qemy.i18n'
])
  .filter('dialogsSearchFilter', [() => {
    return (dialogs, dialogsSearch, dialogsIndex, peerIdNumber) => {
      if (!dialogsIndex || !dialogsSearch) {
        return dialogs;
      }
      let filteredDialogs = SearchIndexManager.search(dialogsSearch, dialogsIndex);
      return dialogs.filter(dialog => {
        return dialog.peer && filteredDialogs[dialog.peer.id]
          || peerIdNumber === dialog.peer.id;
      });
    };
  }])
;