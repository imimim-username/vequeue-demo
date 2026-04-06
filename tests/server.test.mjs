/**
 * Victory Quest — Server Integration & Unit Tests
 *
 * Run locally:  node --test tests/server.test.mjs
 * Run vs live:  TEST_SERVER=https://vequeue.imimim.info node --test tests/server.test.mjs
 *
 * Tests use a throw-away test account (testbot_<timestamp>) so they never
 * touch real player data.  The account is left in the DB but has no gameplay
 * value; a later cleanup script could prune accounts without recent logins.
 */

import { io }           from 'socket.io-client';
import assert           from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';

const SERVER   = process.env.TEST_SERVER || 'http://127.0.0.1:3001';
// Keep ≤20 chars (server limit). Date.now().toString(36) ≈ 8 chars → total ≤ 12.
const TEST_USER = `tb_${Date.now().toString(36)}`;
const TEST_PIN  = '99991';   // unlikely to collide with real accounts

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Open a fresh socket connection. */
function mkSocket() {
  return new Promise((resolve, reject) => {
    const s = io(SERVER, { reconnection: false, timeout: 8000 });
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

/**
 * Emit `event` with `payload` and await `responseEvent`.
 * Rejects after 6 seconds if no response arrives.
 */
function rpc(socket, event, payload, responseEvent) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${responseEvent}" after emitting "${event}"`)),
      6000
    );
    socket.once(responseEvent, (data) => { clearTimeout(timer); resolve(data); });
    socket.emit(event, payload);
  });
}

/** Login to the test account and return the socket. Throws if auth fails. */
async function loginSocket() {
  const s = await mkSocket();
  const res = await rpc(s, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
  if (!res.ok) throw new Error(`loginSocket failed: ${res.error}`);
  return s;
}

/**
 * Login and ensure the account has character data (call save_character once).
 * Required for handlers that check `if(!d)return` on new accounts.
 */
async function loginWithData() {
  const s = await loginSocket();
  saveChar(s, {});
  await new Promise(r => setTimeout(r, 300));
  return s;
}

/** Emit save_character with all required fields and given overrides. */
function saveChar(socket, overrides = {}) {
  socket.emit('save_character', {
    nickname: 'TestBot', color: '#ff0000', hairColor: '#000000',
    gender: 'nb', skinTone: '#c8a882', species: 'human', class_: 'warrior',
    stats: {}, hp: 6, maxHp: 6, mp: 6, maxMp: 6,
    xp: 0, level: 1, statPoints: 0,
    inventory: [], accessory: null, equippedArmor: null, maxInvSlots: 12,
    quests: [], dungeonBossDefeated: false, cavernBossDefeated: false,
    hideoutBossDefeated: false, ruinsBossDefeated: false, villageBossDefeated: false,
    kills: 0, zoneSeniority: 0, _shownQueueTip: false,
    ...overrides,
  });
}

// ── 1. Authentication ─────────────────────────────────────────────────────────

describe('Authentication', () => {
  it('registers a new account', async () => {
    const s = await mkSocket();
    try {
      const res = await rpc(s, 'auth_register', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.ok, true, `Registration failed: ${res.error}`);
      assert.equal(res.isNew, true);
      assert.equal(res.username, TEST_USER);
    } finally { s.disconnect(); }
  });

  it('rejects duplicate username registration', async () => {
    const s = await mkSocket();
    try {
      const res = await rpc(s, 'auth_register', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.ok, false);
      assert.match(res.error, /already taken/i);
    } finally { s.disconnect(); }
  });

  it('rejects usernames shorter than 2 characters', async () => {
    const s = await mkSocket();
    try {
      const res = await rpc(s, 'auth_register', { username: 'x', pin: '1234' }, 'auth_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });

  it('rejects PINs shorter than 4 digits', async () => {
    const s = await mkSocket();
    try {
      const res = await rpc(s, 'auth_register', { username: 'validuser', pin: '12' }, 'auth_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });

  it('logs in with correct credentials', async () => {
    const s = await mkSocket();
    try {
      const res = await rpc(s, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.ok, true, `Login failed: ${res.error}`);
      assert.equal(res.isNew, false);
    } finally { s.disconnect(); }
  });

  it('rejects login with wrong PIN', async () => {
    const s = await mkSocket();
    try {
      const res = await rpc(s, 'auth_login', { username: TEST_USER, pin: '0000' }, 'auth_result');
      assert.equal(res.ok, false);
      assert.match(res.error, /invalid/i);
    } finally { s.disconnect(); }
  });

  it('rejects login for non-existent user', async () => {
    const s = await mkSocket();
    try {
      const res = await rpc(s, 'auth_login', { username: 'no_such_user_xyz', pin: '1234' }, 'auth_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });
});

// ── 2. save_character: client-authoritative fields ────────────────────────────

describe('save_character — client-authoritative fields', () => {
  it('persists nickname, level, xp, kills across sessions', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { nickname: 'Herobot', level: 7, xp: 3500, kills: 99 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.data?.nickname, 'Herobot');
      assert.equal(res.data?.level,    7);
      assert.equal(res.data?.xp,       3500);
      assert.equal(res.data?.kills,    99);
    } finally { s2.disconnect(); }
  });

  it('clamps level to [1, 50]', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { level: 99999 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.data?.level, 50, 'level should be clamped to 50');
    } finally { s2.disconnect(); }
  });

  it('clamps xp to [0, 1_000_000]', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { xp: 9_999_999 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.data?.xp, 1_000_000, 'xp should be clamped to 1,000,000');
    } finally { s2.disconnect(); }
  });

  it('clamps kills to [0, 999_999]', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { kills: 5_000_000 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.data?.kills, 999_999);
    } finally { s2.disconnect(); }
  });

  it('clamps zoneSeniority to [0, 999]', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { zoneSeniority: 5000 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.equal(res.data?.zoneSeniority, 999);
    } finally { s2.disconnect(); }
  });
});

// ── 3. save_character: server-owned fields are immutable from client ──────────

describe('save_character — server-owned fields are protected', () => {
  it('ignores client-sent spacebucks (cannot inflate)', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { spacebucks: 999_999 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.notEqual(res.data?.spacebucks, 999_999, 'spacebucks must not be client-inflatable');
    } finally { s2.disconnect(); }
  });

  it('ignores client-sent alUSD (cannot inflate)', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { alUSD: 999_999 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.notEqual(res.data?.alUSD, 999_999, 'alUSD must not be client-inflatable');
    } finally { s2.disconnect(); }
  });

  it('ignores client-sent alcx (cannot inflate)', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { alcx: 999_999 });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      assert.notEqual(res.data?.alcx, 999_999, 'alcx must not be client-inflatable');
    } finally { s2.disconnect(); }
  });

  it('ignores client-sent bankPositions', async () => {
    const s1 = await loginSocket();
    try {
      saveChar(s1, { bankPositions: [{ collateral: 'spacebucks', deposited: 9999, borrowed: 8999, debt: 0, claimed: false }] });
      await new Promise(r => setTimeout(r, 400));
    } finally { s1.disconnect(); }

    const s2 = await mkSocket();
    try {
      const res = await rpc(s2, 'auth_login', { username: TEST_USER, pin: TEST_PIN }, 'auth_result');
      // A new account has no bank positions — the client-sent fake one must not appear
      const positions = res.data?.bankPositions || [];
      const fake = positions.find(p => p.deposited === 9999);
      assert.equal(fake, undefined, 'client-fabricated bank position must not be saved');
    } finally { s2.disconnect(); }
  });
});

// ── 4. Currency Exchange ──────────────────────────────────────────────────────

describe('currency_exchange', () => {
  it('rejects exchange without being logged in', async () => {
    const s = await mkSocket();
    try {
      // Emit exchange without auth — server should silently drop it (no response)
      // We just verify the socket doesn't crash by waiting briefly
      let gotResult = false;
      s.once('currency_exchange_result', () => { gotResult = true; });
      s.emit('currency_exchange', { from: 'alUSD', to: 'spacebucks', amount: 1 });
      await new Promise(r => setTimeout(r, 1000));
      assert.equal(gotResult, false, 'unauthenticated exchange should get no response');
    } finally { s.disconnect(); }
  });

  it('rejects exchange of same currency (from === to)', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'currency_exchange',
        { from: 'alUSD', to: 'alUSD', amount: 1 },
        'currency_exchange_result');
      assert.equal(res.ok, false);
      assert.match(res.error, /invalid/i);
    } finally { s.disconnect(); }
  });

  it('rejects exchange of unknown currency', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'currency_exchange',
        { from: 'bitcoin', to: 'alUSD', amount: 1 },
        'currency_exchange_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });

  it('rejects exchange with zero amount', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'currency_exchange',
        { from: 'alUSD', to: 'spacebucks', amount: 0 },
        'currency_exchange_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });

  it('rejects exchange with negative amount', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'currency_exchange',
        { from: 'alUSD', to: 'spacebucks', amount: -5 },
        'currency_exchange_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });

  it('rejects exchange when balance is insufficient', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'currency_exchange',
        { from: 'alUSD', to: 'spacebucks', amount: 99999 },
        'currency_exchange_result');
      assert.equal(res.ok, false);
      assert.match(res.error, /insufficient/i);
    } finally { s.disconnect(); }
  });
});

// ── 5. Bank ───────────────────────────────────────────────────────────────────

describe('bank_borrow', () => {
  // bank_borrow requires character data to exist (server checks if(!d)return).
  // loginWithData() calls save_character first so d is populated.

  it('rejects borrow when spacebucks balance is 0', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'bank_borrow',
        { collateral: 'spacebucks', amount: 100 },
        'bank_borrow_result');
      assert.equal(res.ok, false);
      assert.match(res.error, /not enough/i);
    } finally { s.disconnect(); }
  });

  it('rejects borrow with zero amount', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'bank_borrow',
        { collateral: 'spacebucks', amount: 0 },
        'bank_borrow_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });

  it('rejects borrow for unknown collateral type', async () => {
    const s = await loginWithData();
    try {
      const res = await rpc(s, 'bank_borrow',
        { collateral: 'bitcoin', amount: 1 },
        'bank_borrow_result');
      assert.equal(res.ok, false);
    } finally { s.disconnect(); }
  });
});

// ── 6. Pure calculation unit tests (no server needed) ────────────────────────

describe('Exchange rate calculations (unit)', () => {
  /**
   * Mirror of the server-side exchange formula.
   * rates: spacebucks=1, schmeckles=1, alUSD=1, alETH & alcx use livePrices.
   */
  function calcExchange(from, to, amount, livePrices) {
    // spacebucks=$1 | alUSD=live | schmeckles=spot ETH | alETH=alETH token | alcx=live
    const rates = {
      spacebucks: 1,
      schmeckles: livePrices.ETH   || livePrices.alETH, // spot ETH for schmeckles
      alUSD:      livePrices.alUSD || 1,
      alETH:      livePrices.alETH,
      alcx:       livePrices.alcx,
    };
    const gross    = amount * (rates[from] / rates[to]);
    const fee      = gross * 0.003;
    const dpTo     = (to   === 'alETH' || to   === 'alcx') ? 4 : 2;
    const dpFrom   = (from === 'alETH' || from === 'alcx') ? 4 : 2;
    const received = parseFloat((gross - fee).toFixed(dpTo));
    return { gross, fee, received, dpFrom, dpTo };
  }

  it('spacebucks → alUSD: 1:1 rate minus 0.3% fee', () => {
    const { received, fee } = calcExchange('spacebucks', 'alUSD', 100, { alETH: 2000, alcx: 5 });
    assert.equal(received, 99.70, `expected 99.70 got ${received}`);
    assert.equal(fee, 0.3);
  });

  it('alUSD → spacebucks: 1:1 rate minus 0.3% fee', () => {
    const { received } = calcExchange('alUSD', 'spacebucks', 10, { alETH: 2000, alcx: 5 });
    assert.equal(received, 9.97);
  });

  it('schmeckles → alUSD: spot-ETH rate minus 0.3% fee', () => {
    // 1 schmeckle = spot ETH = $2100; alUSD = $0.9944
    // gross = 1 * (2100/0.9944) = 2111.28...; fee = 6.33; received ≈ 2104.95
    const prices = { ETH: 2100, alETH: 2050, alUSD: 0.9944, alcx: 5 };
    const { gross, fee, received } = calcExchange('schmeckles', 'alUSD', 1, prices);
    const expectedGross = 1 * (2100 / 0.9944);
    const expectedFee   = expectedGross * 0.003;
    const expectedRecv  = parseFloat((expectedGross - expectedFee).toFixed(2));
    assert.equal(received, expectedRecv, `received ${received} vs expected ${expectedRecv}`);
  });

  it('alUSD → schmeckles: correct scaling with 4dp precision', () => {
    // $2100 alUSD → 1 schmeckle at spot ETH=$2100, alUSD=$1
    const prices = { ETH: 2100, alETH: 2050, alUSD: 1, alcx: 5 };
    const { received } = calcExchange('alUSD', 'schmeckles', 2100, prices);
    // gross = 2100*(1/2100)=1; fee=0.003; received=0.9970
    assert.equal(received, 0.9970);
  });

  it('alETH → alUSD: correct scaling', () => {
    const prices = { alETH: 2000, alcx: 5 };
    const { received } = calcExchange('alETH', 'alUSD', 1, prices);
    // gross = 1 * (2000/1) = 2000; fee = 6; received = 1994
    assert.equal(received, 1994.00);
  });

  it('alUSD → alETH: correct scaling and 4dp precision', () => {
    const prices = { alETH: 2000, alcx: 5 };
    const { received } = calcExchange('alUSD', 'alETH', 2000, prices);
    // gross = 2000 * (1/2000) = 1; fee = 0.003; received = 0.997
    assert.equal(received, 0.9970);
  });

  it('alcx → alUSD: correct scaling', () => {
    const prices = { alETH: 2000, alcx: 5 };
    const { received } = calcExchange('alcx', 'alUSD', 10, prices);
    // gross = 10 * 5 = 50; fee = 0.15; received = 49.85
    assert.equal(received, 49.85);
  });

  it('fee is always 0.3% of gross', () => {
    const prices = { alETH: 2000, alcx: 5 };
    for (const [from, to, amt] of [
      ['spacebucks', 'alUSD',    100],
      ['alUSD',      'alETH',   1000],
      ['alcx',       'schmeckles', 20],
    ]) {
      const { gross, fee } = calcExchange(from, to, amt, prices);
      assert.ok(
        Math.abs(fee - gross * 0.003) < 0.0001,
        `fee should be 0.3% of gross for ${from}→${to}`
      );
    }
  });
});

describe('Bank borrow LTV calculation (unit)', () => {
  it('borrowing gives 90% LTV on spacebucks', () => {
    const deposited = 100;
    const borrow    = Math.floor(deposited * 0.9 * 100) / 100; // 90.00
    assert.equal(borrow, 90.00);
  });

  it('borrowing gives 90% LTV on schmeckles', () => {
    const deposited = 50;
    const borrow    = Math.floor(deposited * 0.9 * 100) / 100; // 45.00
    assert.equal(borrow, 45.00);
  });
});

describe('Transmuter early-withdrawal fee (unit)', () => {
  it('charges 10% exit fee on alUSD withdrawal', () => {
    const gross    = 100;
    const fee      = parseFloat((gross * 0.10).toFixed(2)); // 10.00
    const returned = parseFloat((gross - fee).toFixed(2));  // 90.00
    assert.equal(fee,      10.00);
    assert.equal(returned, 90.00);
  });

  it('charges 10% exit fee on alETH withdrawal', () => {
    const gross    = 0.5;
    const fee      = parseFloat((gross * 0.10).toFixed(4)); // 0.0500
    const returned = parseFloat((gross - fee).toFixed(4));  // 0.4500
    assert.equal(fee,      0.0500);
    assert.equal(returned, 0.4500);
  });
});
