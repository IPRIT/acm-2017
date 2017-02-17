/*
 * MISIS ACM SYSTEM
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 16.02.2017
 */

import crypto from 'crypto';

let io,
  hashSalt = 'misis_acm_belov_2017',
  initializedAtMs;

export function initialize(s_io) {
  io = s_io;
  initializedAtMs = Date.now();
}

export function getInstance() {
  return io;
}

export function subscribeEvents(socket) {
  console.info(`[${socket.id}] connected to the server.`, );
  
  socket.emit('server started', {
    socketId: socket.id,
    startedAt: initializedAtMs
  });
  
  socket.on('contest.join', function (data) {
    let { contestId } = data;
    if (!contestId) {
      return;
    }
    console.info(`[${socket.id}] joined to contest: ${contestId}.`);
    let contestHashKey = getContestHashKey(contestId);
    socket.join(contestHashKey);
  });
  
  socket.on('contest.left', function (data) {
    let { contestId } = data;
    if (!contestId) {
      return;
    }
    console.info(`[${socket.id}] left from contest: ${contestId}.`);
    var contestHashKey = getContestHashKey(contestId);
    socket.leave(contestHashKey);
  });
  
  socket.on('disconnect', function (data) {
    console.log(`[${socket.id}] disconnected from the server.`, );
  });
}

function getContestHashKey(str) {
  return crypto.createHash('md5').update(str + hashSalt).digest('hex');
}

export function emitNewSolutionEvent(params = {}) {
  let { contestId, solution } = params;
  emitContestEvent(contestId, 'new solution', solution);
}

export function emitTableUpdateEvent(params = {}) {
  let { contestId, table = {} } = params;
  emitContestEvent(contestId, 'table update', table);
}

export function emitVerdictUpdateEvent(params = {}) {
  let { contestId, solution } = params;
  emitContestEvent(contestId, 'verdict updated', solution);
}

export function emitNewMessageEvent(params = {}) {
  let { contestId, message } = params;
  emitContestEvent(contestId, 'new message', message);
}

export function emitResetSolutionEvent(params = {}) {
  let { contestId, solutionId } = params;
  emitContestEvent(contestId, 'reset solution', { solutionId });
}

function emitContestEvent(contestId, eventName, data = {}) {
  let contestHashKey = getContestHashKey(contestId);
  console.info(`Emitting socket.io event: ${eventName}:${contestId}`);
  io.to(contestHashKey).emit(eventName, data);
}