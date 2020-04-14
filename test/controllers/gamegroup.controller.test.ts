import request from 'supertest';
import { Connection, createConnection } from 'typeorm';
import { AppServer } from '../../config/server';
import { GameGroup } from '../../src/models/gameGroup';
import { testSetup } from '../../config/test_setup';
import { UsersGameGroup } from '../../src/models/usersGameGroup';

const server = new AppServer();
const { appInstance } = server;
const rekwest = request(appInstance);

describe.only('User controllers', () => {
  let connection: Connection;
  let ACTIVE_JWT: string;
  let createGG: Function;
  const userInfo = {
    username: 'test',
    email: 'foobar@gmail.com',
    password: 'password'
  };
  const EXPIRED_HEADER =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZW1haWwiOiJub2NhcEBnbWFpbC5jb20iLCJ1c2VybmFtZSI6Im5vY2FwIiwiaWF0IjoxNTgwODc0OTMxLCJleHAiOjE1ODA4ODU3MzF9.-f9zq8LdOwdCuwZkS_T1oyFOoxIVJ5lSv5zWHClOiUs';

  beforeEach(async () => {
    connection = await createConnection(testSetup);
    const res = await rekwest.post('/api/v1/signup').send({ ...userInfo });
    ACTIVE_JWT = res.body.payload.token;
    createGG = (): Promise<any> => {
      return rekwest
        .post('/api/v1/game_groups')
        .send({ title: 'game1' })
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
    };
  });

  afterEach(async () => {
    connection.close();
  });

  describe('POST: createGameGroup, /game_groups route', () => {
    test('should success response on creating a GameGroup', async () => {
      const res = await rekwest
        .post('/api/v1/game_groups')
        .send({ title: 'game1' })
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.status).toBe(200);
    });

    test('should fail if unauthorized', async () => {
      const res = await rekwest
        .post('/api/v1/game_groups')
        .send({ title: 'aswd' })
        .set('Authorization', `Bearer ${EXPIRED_HEADER}`);
      expect(res.status).toBe(401);
    });

    test('should have keys', async () => {
      const res = await rekwest
        .post('/api/v1/game_groups')
        .send({ title: 'aswd' })
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.body.meta).toContainKeys(['createdAt']);
      expect(res.body.payload.gameGroup).toContainKeys(['id', 'title']);
    });
  });

  describe('GET: readGameGroup, /game_groups route/:id', () => {
    test('should success getting a GameGroup', async () => {
      const gg = await createGG();
      const res = await rekwest
        .get(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.status).toBe(200);
    });

    test('should fail if unauthorized', async () => {
      const gg = await createGG();
      const res = await rekwest
        .get(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${EXPIRED_HEADER}`);
      expect(res.status).toBe(401);
    });

    test('should return 404 if no GameGroup found', async () => {
      const res = await rekwest.get('/api/v1/game_groups/123123').set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.status).toBe(404);
    });

    test('should get false since user is not following this GameGroup', async () => {
      const gg = await createGG();
      const res = await rekwest
        .get(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.body.payload.isFollower).toBe(false);
    });

    test('should get false since user is not following this GameGroup', async () => {
      const gg = await createGG();
      const res = await rekwest
        .get(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.body.payload.isFollower).toBe(false);
    });

    test('should return these json keys', async () => {
      const gg = await createGG();
      await rekwest
        .put(`/api/v1/game_groups/follow/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);

      const res = await rekwest
        .get(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.body.payload.isFollower).toBe(true);
      expect(res.body.payload).toContainKeys(['isFollower', 'gameGroup']);
      expect(res.body.payload.gameGroup).toContainKeys(['id', 'title', 'createdAt', 'usersGameGroups']);
      expect(res.body.payload.gameGroup.usersGameGroups).toBeArray();
    });
  });

  describe('PUT: updateGameGroup, /game_groups/:id route', () => {
    test('should fail if unauthorized', async () => {
      const gg = await createGG();
      const res = await rekwest
        .put(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${EXPIRED_HEADER}`);
      expect(res.status).toBe(401);
    });

    test('should return status 404 if no ID is found', async () => {
      const res = await rekwest.put('/api/v1/game_groups/123123').set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.status).toBe(404);
    });

    test('should update a GameGroup', async () => {
      const gg = await createGG();
      const res = await rekwest
        .put(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .send({ title: 'updateddddd' })
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.status).toBe(200);
      expect(res.body.payload.gameGroup.title).toBe('updateddddd');
    });
  });

  describe('DELETE: deleteGameGroup, /game_groups/:id route', () => {
    test('should reduced count of GameGroup', async () => {
      const gg = await createGG();
      const res = await rekwest
        .delete(`/api/v1/game_groups/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);

      const ggCount = await GameGroup.count();
      expect(res.status).toBe(200);
      expect(ggCount).toBe(0);
    });

    test('should return status 404 if no ID is found', async () => {
      const res = await rekwest.delete('/api/v1/game_groups/123123').set('Authorization', `Bearer ${ACTIVE_JWT}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT: followGameGroup, /game_groups/follow/:id route', () => {
    test('should follow a GameGroup', async () => {
      const gg = await createGG();
      const res = await rekwest
        .put(`/api/v1/game_groups/follow/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);

      expect(res.status).toBe(200);
      expect(res.body.payload.gameGroup.message).toBe('success');
    });

    test('should return status 404 if no ID is found', async () => {
      const gg = await createGG();
      const res = await rekwest
        .put(`/api/v1/game_groups/follow/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${EXPIRED_HEADER}`);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE: unFollowGameGroup, /game_groups/unfollow/:id route', () => {
    test('should unfollow a GameGroup', async () => {
      const gg = await createGG();
      await rekwest
        .put(`/api/v1/game_groups/follow/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);

      const res = await rekwest
        .delete(`/api/v1/game_groups/unfollow/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${ACTIVE_JWT}`);

      const uggCount = await UsersGameGroup.count();
      expect(res.status).toBe(200);
      expect(uggCount).toBe(0);
      expect(res.body.payload.gameGroup.message).toBe('success');
    });

    test('should return status 401 if unauthorized', async () => {
      const gg = await createGG();
      const res = await rekwest
        .delete(`/api/v1/game_groups/unfollow/${gg.body.payload.gameGroup.id}`)
        .set('Authorization', `Bearer ${EXPIRED_HEADER}`);
      expect(res.status).toBe(401);
    });
  });
});
