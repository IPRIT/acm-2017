const groups = {
  admin: {
    mask: 0x1000,
    name: 'Admin'
  },
  moderator: {
    mask: 0x400,
    name: 'Moderator'
  },
  user: {
    mask: 0x100,
    name: 'User'
  },
  locked: {
    mask: 0x10,
    name: 'Locked'  
  },
  all: {
    mask: 0x1000 | 0x400 | 0x100 | 0x10,
    name: 'All'
  }
};

let utils = {
  resolveGroup: group => group.mask 
    ? group : (Number.isInteger(group) ? utils.groupByMask(group) : groups[ group ]),
  
  resolveAllGroups: (...groups) => groups.map(utils.resolveGroup),

  hasRight: (group, mask) => (mask & utils.resolveGroup( group ).mask) === utils.resolveGroup( group ).mask,
  
  grouping: (...groups) => groups.reduce((mask, group) => mask | utils.resolveGroup( group ).mask, 0),

  addGroup: (mask, group) => mask | utils.resolveGroup( group ).mask,

  removeGroup: (mask, group) => mask ^ utils.resolveGroup( group ).mask,
  
  groupByMask: mask => {
    if (mask === groups.all.mask) {
      return groups.all;
    }
    let filteredGroups = utils.groupsByMask(mask);
    if (!filteredGroups.length) {
      throw new HttpError('Group not found');
    }
    return filteredGroups[0];
  },
  
  groupsByMask: mask => Object.keys(groups)
    .filter(groupKey => groupKey !== 'all' && utils.hasRight(groupKey, mask))
    .map(groupKey => groups[ groupKey ]),
  
  groupsByMaskSorted: (mask, order = 'desc') => {
    let sign = order === 'desc' ? -1 : 1;
    return utils.groupsByMask(mask)
      .sort((a, b) => sign * (a.mask - b.mask));
  },
  
  maxGroupByMask: mask => {
    let filteredGroups = utils.groupsByMaskSorted(mask);
    if (!filteredGroups.length) {
      throw new HttpError('Group not found');
    }
    return filteredGroups[0];
  },
  
  minGroupByMask: mask => {
    let filteredGroups = utils.groupsByMaskSorted(mask, 'asc');
    if (!filteredGroups.length) {
      throw new HttpError('Group not found');
    }
    return filteredGroups[0];
  }
};

export default { groups, utils };