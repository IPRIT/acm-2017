import request from 'request-promise';

const ACM_HOST = 'http://codeforces.com';
const API_PATH = '/api';


function requestMethod(apiUrl, params) {
  return request({
    method: 'GET',
    uri: apiUrl,
    qs: params,
    simple: false,
    json: true,
    followAllRedirects: true
  });
}

function buildEndpoint(pathTo = '') {
  return `${ACM_HOST}${API_PATH}${pathTo}`;
}


export function getContestsList(params) {
  const methodUri = '/contest.list';
  return requestMethod(buildEndpoint(methodUri), params);
}


export function getContestStandings(params) {
  const methodUri = '/contest.standings';
  return requestMethod(buildEndpoint(methodUri), params);
}


export function getContestStatus(params) {
  const methodUri = '/contest.status';
  return requestMethod(buildEndpoint(methodUri), params);
}


export function getProblemset(params) {
  const methodUri = '/problemset.problems';
  return requestMethod(buildEndpoint(methodUri), params);
}


export function getProblemsetRecentStatus(params) {
  const methodUri = '/problemset.recentStatus';
  return requestMethod(buildEndpoint(methodUri), params);
}

export function getUserStatus(params) {
  const methodUri = '/user.status';
  return requestMethod(buildEndpoint(methodUri), params);
}