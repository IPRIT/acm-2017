import * as models from "../models";
import * as userMethods from '../route/user/methods';

export class RatingsStore {

  static instance;

  static getInstance() {
    if (RatingsStore.instance) {
      return RatingsStore.instance;
    }
    return (RatingsStore.instance = new RatingsStore());
  }

  isReady;
  isStartingUpdate;
  ratings = new Map();

  constructor() {
    this.isReady = false;
    this.isStartingUpdate = false;
  }

  async retrieve() {
    console.log('[Rating store] Updating...');
    this.isStartingUpdate = true;
    let groups = await models.Group.findAll();
    for (let group of groups) {
      let ratingsForGroup = await userMethods.getRatingTable({ group });
      for (let rating of ratingsForGroup) {
        let groupId = group.id;
        let userId = rating.User.id;
        this.ratings.set(`${groupId}_${userId}`, rating);
      }
    }
    console.log('[Rating store] Updated.');
    this.isReady = true;
  }

  async getRatingValue(groupId, userId) {
    if (!this.isReady && !this.isStartingUpdate) {
      await this.retrieve();
    }
    let rating = this.ratings.get(`${groupId}_${userId}`);
    if (rating) {
      return rating.ratingAfter;
    }
    return 0;
  }

  async update() {
    this.clear();
    await this.retrieve();
  }

  clear() {
    this.ratings.clear();
    this.isReady = false;
    this.isStartingUpdate = false;
  }
}