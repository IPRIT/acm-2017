/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

"use strict";

angular.module('Qemy.services.admin', [
  'Qemy.i18n'
])
  
  .service('AdminManager', ['$http', function ($http) {
    
    function dataEncode(data) {
      var paramPairs = [];
      for (var el in data) {
        if (!data.hasOwnProperty(el)) continue;
        paramPairs.push(el + '=' + data[el]);
      }
      return paramPairs.join('&');
    }
    
    function searchGroups(params) {
      return $http({
        method: 'get',
        url: '/api/admin/groups',
        params: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function searchProblems(params, requestOpts) {
      requestOpts = requestOpts || {};
      return $http({
        method: 'get',
        url: '/api/admin/problems',
        params: params,
        timeout: requestOpts.timeout
      }).then(function (data) {
        return data.data;
      });
    }
    
    function createContest(params) {
      return $http({
        method: 'post',
        url: '/api/admin/contests',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function getVerdicts(params) {
      return $http({
        method: 'get',
        url: '/api/admin/verdicts',
        params: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function updateContest(params) {
      return $http({
        method: 'post',
        url: '/api/admin/contests/' + params.contestId,
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function deleteContest(params) {
      return $http({
        method: 'delete',
        url: '/api/admin/contests/' + params.contestId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function repairContest(params) {
      return $http({
        method: 'post',
        url: '/api/admin/contests/' + params.contestId + '/repair'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function getContestInfo(params) {
      return $http({
        method: 'get',
        url: '/api/admin/contests/' + params.contestId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function getUsers(params) {
      return $http({
        method: 'get',
        url: '/api/admin/users',
        params: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function searchUsers(params) {
      return $http({
        method: 'get',
        url: '/api/admin/users',
        params: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function deleteUser(params) {
      return $http({
        method: 'delete',
        url: '/api/admin/users/' + params.userId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function createUser(params) {
      return $http({
        method: 'post',
        url: '/api/admin/users',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function getUser(params) {
      return $http({
        method: 'get',
        url: '/api/admin/users/' + params.userId
      }).then(function (response) {
        return response.data ? response.data : {};
      });
    }
    
    function updateUser(params) {
      return $http({
        method: 'post',
        url: '/api/admin/users/' + params.userId,
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function setProblemsForContest(params) {
      return $http({
        method: 'post',
        url: '/api/admin/contests/' + params.contestId + '/problems',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function scanTimus() {
      return $http({
        method: 'post',
        url: '/api/admin/scanTimus'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function scanCfProblemset() {
      return $http({
        method: 'post',
        url: '/api/admin/scanCf'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function scanCfGym() {
      return $http({
        method: 'post',
        url: '/api/admin/scanCfGyms'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function scanAcmp() {
      return $http({
        method: 'post',
        url: '/api/admin/scanAcmp'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function scanSgu() {
      return $http({
        method: 'post',
        url: '/api/admin/scanSgu'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function restart() {
      return $http({
        method: 'post',
        url: '/api/admin/restart'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function setVerdictForSent(params) {
      return $http({
        method: 'post',
        url: '/api/admin/solutions/' + params.solutionId + '/verdict',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function sendSolutionAgain(params) {
      return $http({
        method: 'post',
        url: '/api/admin/solutions/' + params.solutionId + '/duplicate',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function refreshSolution(params) {
      return $http({
        method: 'post',
        url: '/api/admin/solutions/' + params.solutionId + '/refresh'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function refreshSolutionForProblem(params) {
      return $http({
        method: 'post',
        url: '/api/admin/contests/' + params.contestId + '/solutions/refresh/' + params.symbolIndex
      }).then(function (data) {
        return data.data;
      });
    }
    
    function refreshSolutionForProblemAndUser(params) {
      return $http({
        method: 'post',
        url:  '/api/admin/contests/' + params.contestId + '/solutions/refresh/' + params.symbolIndex + '/' + params.userId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function refreshSolutionForUser(params) {
      return $http({
        method: 'post',
        url:  '/api/admin/contests/' + params.contestId + '/solutions/refresh/all/' + params.userId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function refreshAllSolutions(params) {
      return $http({
        method: 'post',
        url: '/api/admin/contests/' + params.contestId + '/solutions/refresh'
      }).then(function (data) {
        return data.data;
      });
    }
    
    function deleteSolution(params) {
      return $http({
        method: 'delete',
        url: '/api/admin/solutions/' + params.solutionId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function getRatingTable(params) {
      return $http({
        method: 'post',
        url: '/api/admin/ratingTable',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function getGroups(params) {
      return $http({
        method: 'get',
        url: '/api/admin/groups',
        params: params
      }).then(function (response) {
        return response.data;
      });
    }
    
    function getGroup(params) {
      return $http({
        method: 'get',
        url: '/api/admin/groups/' + params.groupId
      }).then(function (response) {
        return response.data;
      });
    }
    
    function getCondition(params) {
      return $http({
        method: 'get',
        url: '/api/admin/problems/' + params.problemId
      }).then(function (response) {
        return response.data;
      });
    }
    
    function createGroup(params) {
      return $http({
        method: 'post',
        url: '/api/admin/groups',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function updateGroup(params) {
      return $http({
        method: 'post',
        url: '/api/admin/groups/' + params.groupId,
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function deleteGroup(params) {
      return $http({
        method: 'delete',
        url: '/api/admin/groups/' + params.groupId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function updateCondition(params) {
      return $http({
        method: 'post',
        url: '/api/admin/problems/' + params.id,
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    function deleteProblem(params) {
      return $http({
        method: 'delete',
        url: '/api/admin/problems/' + params.problemId
      }).then(function (data) {
        return data.data;
      });
    }
    
    function createEjudgeProblem(params) {
      return $http({
        method: 'post',
        url: '/api/admin/problems/new/ejudge',
        data: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    return {
      searchGroups: searchGroups,
      searchProblems: searchProblems,
      createContest: createContest,
      deleteContest: deleteContest,
      repairContest: repairContest,
      getContestInfo: getContestInfo,
      updateContest: updateContest,
      getUsers: getUsers,
      searchUsers: searchUsers,
      deleteUser: deleteUser,
      createUser: createUser,
      getUser: getUser,
      updateUser: updateUser,
      scanTimus: scanTimus,
      scanCfProblemset: scanCfProblemset,
      scanCfGym: scanCfGym,
      scanAcmp: scanAcmp,
      scanSgu: scanSgu,
      restart: restart,
      setVerdictForSent: setVerdictForSent,
      sendSolutionAgain: sendSolutionAgain,
      refreshSolution: refreshSolution,
      refreshSolutionForProblem: refreshSolutionForProblem,
      refreshSolutionForProblemAndUser: refreshSolutionForProblemAndUser,
      refreshSolutionForUser: refreshSolutionForUser,
      refreshAllSolutions: refreshAllSolutions,
      deleteSolution: deleteSolution,
      getRatingTable: getRatingTable,
      getGroups: getGroups,
      getGroup: getGroup,
      createGroup: createGroup,
      updateGroup: updateGroup,
      deleteGroup: deleteGroup,
      getCondition: getCondition,
      updateCondition: updateCondition,
      deleteProblem: deleteProblem,
      createEjudgeProblem: createEjudgeProblem,
      getVerdicts: getVerdicts,
      setProblemsForContest: setProblemsForContest
    }
  }])
;