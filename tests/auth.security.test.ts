import request from 'supertest';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { ExpenseModel } from '../src/models/expense.model.js';
import { dbConfig } from '../src/config/database.config.js';

describe('Authentication & Data Isolation Security Tests (IDOR Prevention)', () => {
  jest.setTimeout(30000);
  let app: any;
  let tokenA: string;
  let tokenB: string;
  let userIdA: string;
  let userIdB: string;
  let expenseIdA: string;

  beforeAll(async () => {
    app = createApp();
    await dbConfig.connect();

    // Clear test databases
    await UserModel.deleteMany({});
    await ExpenseModel.deleteMany({});

    // Register User A
    const resRegA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User A', email: 'usera@example.com', password: 'Password123' });
    expect(resRegA.status).toBe(201);

    // Login User A
    const resLogA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'usera@example.com', password: 'Password123' });
    expect(resLogA.status).toBe(200);
    tokenA = resLogA.body.data.accessToken;
    userIdA = resLogA.body.data.user.id;

    // Register User B
    const resRegB = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'User B', email: 'userb@example.com', password: 'Password123' });
    expect(resRegB.status).toBe(201);

    // Login User B
    const resLogB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'userb@example.com', password: 'Password123' });
    expect(resLogB.status).toBe(200);
    tokenB = resLogB.body.data.accessToken;
    userIdB = resLogB.body.data.user.id;
    expect(userIdB).toBeDefined();
  }, 30000);

  afterAll(async () => {
    await UserModel.deleteMany({});
    await ExpenseModel.deleteMany({});
    await dbConfig.disconnect();
  }, 30000);

  describe('Create Expense & Access Controls', () => {
    it('should allow User A to create an expense', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          title: 'Business Lunch',
          amount: 120.5,
          currency: 'USD',
          category: 'Food',
          merchant: 'Starbucks',
          transactionDate: new Date().toISOString(),
          paymentMethod: 'Credit Card',
        });
      expect(res.status).toBe(201);
      expenseIdA = res.body.data._id;
      expect(res.body.data.userId).toBe(userIdA);
    });

    it('should deny access if no Authorization header is provided', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses/${expenseIdA}`)
        .set('x-test-no-bypass', 'true');
      expect(res.status).toBe(401);
    });

    it('should return 404/Not Found when User B attempts to access User A\'s expense (IDOR Prevention)', async () => {
      const res = await request(app)
        .get(`/api/v1/expenses/${expenseIdA}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
    });

    it('should return 404/Not Found when User B attempts to update User A\'s expense (IDOR Prevention)', async () => {
      const res = await request(app)
        .put(`/api/v1/expenses/${expenseIdA}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ amount: 9999.99 });
      expect(res.status).toBe(404);

      // Verify it was NOT updated
      const verify = await ExpenseModel.findById(expenseIdA);
      expect(verify?.amount).toBe(120.5);
    });

    it('should return 404/Not Found when User B attempts to delete User A\'s expense (IDOR Prevention)', async () => {
      const res = await request(app)
        .delete(`/api/v1/expenses/${expenseIdA}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(404);

      // Verify it was NOT deleted
      const verify = await ExpenseModel.findById(expenseIdA);
      expect(verify).not.toBeNull();
    });

    it('should filter getExpenses list to only return owned expenses', async () => {
      const resB = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(resB.status).toBe(200);
      expect(resB.body.data.length).toBe(0); // User B has no expenses

      const resA = await request(app)
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resA.status).toBe(200);
      expect(resA.body.data.length).toBe(1);
      expect(resA.body.data[0]._id).toBe(expenseIdA);
    });
  });
});
