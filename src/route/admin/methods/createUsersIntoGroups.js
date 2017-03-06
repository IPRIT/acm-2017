import * as models from "../../../models";
import Promise from 'bluebird';
import userGroups from './../../../models/User/userGroups';
import * as contests from '../../contest/methods';
import csv from 'fast-csv';
import encoding from 'encoding';
import iconv from 'iconv-lite';
import latinize from 'latinize';
import { ensureNumber } from "../../../utils/utils";

export function createUsersIntoGroupsRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return createUsersIntoGroups(
      Object.assign({
        user: req.user
      }, { req, res, next })
    );
  }).catch(next);
}

export async function createUsersIntoGroups(params) {
  let { user, req, res, next } = params;
  
  let lines = [];
  const csvStream = csv().on('data', data => {
    let line = sanitizeLine(data.toString()).split(';');
    if (Array.isArray(line) && line.length === 5) {
      lines.push( line );
    }
  }).on('end', () => {
    try {
      handleData(lines, req, res, next);
    } catch (error) {
      next(error);
    }
  }).on('error', next);
  
  req.stream.file
    .pipe(iconv.decodeStream('win1251'))
    .pipe(iconv.encodeStream('utf8'))
    .pipe(csvStream);
}

function handleData(lines, req, res, next) {
  if (!Array.isArray(lines) || !lines.length) {
    throw new HttpError('File format is not supported');
  }
  let { groupIds } = req.body;
  groupIds = (
    (groupIds || '').split(',') || []
  ).filter(groupId => groupId).map(ensureNumber);
  
  return Promise.resolve(lines.slice(1)).map(line => {
    let [ firstName, lastName, username, password, isAdmin = false ] = line;
    username = username || generateUsername(firstName, lastName);
    password = password || username;
    isAdmin = isAdmin == 1;
    console.log(firstName, lastName, username, password, isAdmin);
    return models.User.create({
      username,
      firstName,
      lastName,
      password,
      accessGroup: isAdmin ? userGroups.groups.admin.mask : userGroups.groups.user.mask
    }).catch(error => console.error('[User creation] Incorrect user type'));
  }).map(user => {
    return user && user.setGroups(groupIds);
  }).then(result => res.json(result)).catch(next);
}

function sanitizeLine(line) {
  return line.replace(/[^a-zA-Zа-яА-Я0-9_. -;]+/gi, '');
}

function generateUsername(firstName = '', lastName = '') {
  firstName = firstName.toLowerCase();
  lastName = lastName.toLowerCase();
  if (!firstName && !lastName) {
    return '';
  } else if (!firstName) {
    return latinize(lastName);
  } else if (!lastName) {
    return latinize(firstName);
  } else {
    return `${latinize(firstName[0])}.${latinize(lastName)}`;
  }
}