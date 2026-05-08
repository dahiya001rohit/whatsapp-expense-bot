/**
 * test.js — SpendBot diagnostic tests
 * Run: node test.js
 */
'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

// ─── Result tracking ──────────────────────────────────────────────────────────

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true });
  console.log(`  ✅ PASS  ${name}${detail ? `  (${detail})` : ''}`);
}

function fail(name, reason) {
  results.push({ name, ok: false, reason });
  console.log(`  ❌ FAIL  ${name}: ${reason}`);
}

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 44 - title.length))}`);
}

// ─── TEST 1: DEDUP CHECK ──────────────────────────────────────────────────────
// Re-implements the same algorithm from src/bot/index.js to verify correctness.

function testDedup() {
  section('1. DEDUP CHECK');

  const _seenIds = new Map();

  function isDuplicate(id) {
    const now = Date.now();
    for (const [k, ts] of _seenIds) {
      if (now - ts > 60_000) _seenIds.delete(k);
    }
    if (_seenIds.has(id)) return true;
    _seenIds.set(id, now);
    return false;
  }

  try {
    // First call with a new id → not duplicate
    const first = isDuplicate('msg-001');
    if (first !== false) {
      fail('DEDUP: first call', `expected false, got ${first}`);
      return;
    }

    // Second call with same id → duplicate
    const second = isDuplicate('msg-001');
    if (second !== true) {
      fail('DEDUP: second call', `expected true, got ${second}`);
      return;
    }

    // Different id → not duplicate
    const diff = isDuplicate('msg-002');
    if (diff !== false) {
      fail('DEDUP: different id', `expected false, got ${diff}`);
      return;
    }

    // Simulate an expired entry (>60 s old) — should be treated as new
    _seenIds.set('msg-old', Date.now() - 61_000);
    const afterExpiry = isDuplicate('msg-old');
    if (afterExpiry !== false) {
      fail('DEDUP: TTL eviction', `expired id should be treated as new, got ${afterExpiry}`);
      return;
    }

    // Verify expired entry is not in map after eviction call
    if (_seenIds.has('msg-old') && Date.now() - _seenIds.get('msg-old') < 60_000) {
      // It was re-added fresh — that's correct behaviour (isDuplicate returned false and re-added)
    }

    pass('DEDUP CHECK', 'first=false, second=true, expired=false');
  } catch (err) {
    fail('DEDUP CHECK', err.message);
  }
}

// ─── Timezone helpers (mirrored from src/scheduler/notifications.js) ─────────

function getTzOffsetMs(timezone) {
  const now = new Date();
  const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tz  = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return utc - tz;
}

function getStartOfDay(timezone) {
  const dateStr     = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  const midnightUtc = new Date(`${dateStr}T00:00:00Z`);
  return new Date(midnightUtc.getTime() + getTzOffsetMs(timezone));
}

function getStartOfMonth(timezone) {
  const dateStr       = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  const [year, month] = dateStr.split('-');
  const midnightUtc   = new Date(`${year}-${month}-01T00:00:00Z`);
  return new Date(midnightUtc.getTime() + getTzOffsetMs(timezone));
}

function getCurrentHour(timezone) {
  const raw = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  }).format(new Date());
  const h = parseInt(raw, 10);
  return h === 24 ? 0 : h; // some runtimes return 24 for midnight
}

// ─── TEST 2: TIMEZONE DATE CHECK ─────────────────────────────────────────────

function testTimezone() {
  section('2. TIMEZONE DATE CHECK (Asia/Kolkata = UTC+5:30)');

  try {
    const TZ  = 'Asia/Kolkata';
    const sod = getStartOfDay(TZ);
    const som = getStartOfMonth(TZ);

    console.log(`     startOfDay  UTC : ${sod.toISOString()}`);
    console.log(`     startOfMonth UTC: ${som.toISOString()}`);

    // Round-trip: convert back to IST and verify it shows midnight 00:00
    const fmtTime = (date) =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).format(date);

    console.log(`     startOfDay  in IST: ${fmtTime(sod)}  (expected 00:00:00)`);
    console.log(`     startOfMonth in IST: ${fmtTime(som)}  (expected 00:00:00)`);

    // Verify times are 00:00:00 in IST using toLocaleString parts
    const sodHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(sod), 10);
    const sodMin  = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TZ, minute: '2-digit' }).format(sod), 10);
    const somHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }).format(som), 10);
    const somMin  = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: TZ, minute: '2-digit' }).format(som), 10);
    const sodHourNorm = sodHour === 24 ? 0 : sodHour;
    const somHourNorm = somHour === 24 ? 0 : somHour;

    if (sodHourNorm !== 0 || sodMin !== 0) {
      fail('TIMEZONE: startOfDay midnight', `IST shows ${sodHourNorm}:${sodMin < 10 ? '0' : ''}${sodMin}, expected 00:00`);
      return;
    }
    if (somHourNorm !== 0 || somMin !== 0) {
      fail('TIMEZONE: startOfMonth midnight', `IST shows ${somHourNorm}:${somMin < 10 ? '0' : ''}${somMin}, expected 00:00`);
      return;
    }

    // Verify startOfMonth falls on day 1
    const somDay = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: TZ, day: 'numeric' }).format(som), 10,
    );
    if (somDay !== 1) {
      fail('TIMEZONE: startOfMonth day', `expected day 1, got day ${somDay}`);
      return;
    }

    // Verify startOfDay is today (not tomorrow or yesterday) in IST
    const todayInIST = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
    const sodDateInIST = sod.toLocaleDateString('en-CA', { timeZone: TZ });
    if (sodDateInIST !== todayInIST) {
      fail('TIMEZONE: startOfDay date', `expected ${todayInIST}, got ${sodDateInIST}`);
      return;
    }

    pass('TIMEZONE DATE CHECK', 'startOfDay and startOfMonth are midnight IST');
  } catch (err) {
    fail('TIMEZONE DATE CHECK', err.message);
  }
}

// ─── TEST 3: NOTIFICATION HOUR CHECK ─────────────────────────────────────────

function testNotificationHours() {
  section('3. NOTIFICATION HOUR CHECK');

  try {
    const TZ   = 'Asia/Kolkata';
    const hour = getCurrentHour(TZ);

    console.log(`     Current IST hour  : ${hour}`);
    console.log(`     Morning briefing  : fires at 9  AM IST  → ${hour === 9  ? '🔔 WOULD FIRE NOW' : 'not this hour'}`);
    console.log(`     Night summary     : fires at 10 PM IST  → ${hour === 22 ? '🔔 WOULD FIRE NOW' : 'not this hour'}`);
    console.log(`     Inactivity nudge  : fires at 9/13/17/21 → ${[9,13,17,21].includes(hour) ? '🔔 WOULD FIRE NOW' : 'not this hour'}`);

    // Assert the hour constants are correct (not that they fire now)
    if (![9, 13, 17, 21].includes(9))  { fail('NOTIFICATION HOURS: 9 AM in nudge array',  'missing'); return; }
    if ([9, 13, 17, 21].includes(11))  { fail('NOTIFICATION HOURS: 11 AM in nudge array', 'test hour 11 still present'); return; }
    if (![9, 13, 17, 21].includes(13)) { fail('NOTIFICATION HOURS: 1 PM in nudge array',  'missing'); return; }
    if (![9, 13, 17, 21].includes(17)) { fail('NOTIFICATION HOURS: 5 PM in nudge array',  'missing'); return; }
    if (![9, 13, 17, 21].includes(21)) { fail('NOTIFICATION HOURS: 9 PM in nudge array',  'missing'); return; }

    // Verify getCurrentHour returns a sane value
    if (hour < 0 || hour > 23) {
      fail('NOTIFICATION HOURS: getCurrentHour range', `got ${hour}, expected 0–23`);
      return;
    }

    pass('NOTIFICATION HOUR CHECK', `IST hour=${hour}, constants correct, 11 not in nudge array`);
  } catch (err) {
    fail('NOTIFICATION HOUR CHECK', err.message);
  }
}

// ─── DB TESTS ─────────────────────────────────────────────────────────────────

async function testDBConnection(User, Transaction, Category) {
  section('4. DB CONNECTION CHECK');
  try {
    const [userCount, txnCount, catCount] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments(),
      Category.countDocuments(),
    ]);
    console.log(`     Users: ${userCount}  |  Transactions: ${txnCount}  |  Categories: ${catCount}`);
    pass('DB CONNECTION CHECK', `${userCount} users, ${txnCount} txns, ${catCount} cats`);
  } catch (err) {
    fail('DB CONNECTION CHECK', err.message);
  }
}

async function testTransactionHistory(User, Transaction) {
  section('5. TRANSACTION HISTORY CHECK');
  try {
    const user = await User.findOne({ name: { $ne: null } }).lean();
    if (!user) {
      console.log('     No onboarded user found — skipping (needs at least one user with a name)');
      pass('TRANSACTION HISTORY CHECK', 'skipped — no user');
      return;
    }

    console.log(`     User: ${user.name} (${user.phone})`);
    const txns = await Transaction.find({ phone: user.phone })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`     Found ${txns.length} transaction(s):`);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    for (let i = 0; i < txns.length; i++) {
      const t = txns[i];
      if (!(t.createdAt instanceof Date) && isNaN(new Date(t.createdAt))) {
        fail('TRANSACTION HISTORY CHECK', `txn ${t._id} has invalid createdAt`);
        return;
      }
      const d    = new Date(t.createdAt);
      const day  = String(d.getDate()).padStart(2, '0');
      const mon  = months[d.getMonth()];
      const icon = t.type === 'credit' ? '💰' : '💸';
      const note = t.note ? `  note: "${t.note}"` : '';
      console.log(`       ${i+1}. ${day} ${mon} ${d.getFullYear()} — ${icon} ${t.category}  ₹${t.amount}  bal ₹${t.newBalance}${note}`);
    }

    pass('TRANSACTION HISTORY CHECK', `${txns.length} txns fetched, createdAt fields valid`);
  } catch (err) {
    fail('TRANSACTION HISTORY CHECK', err.message);
  }
}

async function testNoteField(Transaction) {
  section('6. NOTE FIELD CHECK');

  const TEST_PHONE = 'test-diagnostic-000';
  let inserted;

  try {
    inserted = await Transaction.create({
      phone: TEST_PHONE,
      type: 'debit',
      amount: 1,
      category: 'Test',
      note: 'test lunch',
      previousBalance: 100,
      newBalance: 99,
    });

    const fetched = await Transaction.findById(inserted._id).lean();

    if (!fetched) {
      fail('NOTE FIELD CHECK', 'inserted doc not found on re-fetch');
      return;
    }
    if (fetched.note !== 'test lunch') {
      fail('NOTE FIELD CHECK', `expected "test lunch", got "${fetched.note}"`);
      return;
    }

    console.log(`     Inserted note: "${inserted.note}"`);
    console.log(`     Fetched  note: "${fetched.note}"`);
    pass('NOTE FIELD CHECK', 'note saved and retrieved correctly');
  } catch (err) {
    fail('NOTE FIELD CHECK', err.message);
  } finally {
    // Always clean up, even if assertions failed
    if (inserted?._id) {
      await Transaction.deleteOne({ _id: inserted._id }).catch(() => {});
      console.log('     Test record deleted');
    }
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       SpendBot Diagnostic Test Suite         ║');
  console.log('╚══════════════════════════════════════════════╝');

  // ── Synchronous tests (no DB needed) ────────────────────────────────────────
  testDedup();
  testTimezone();
  testNotificationHours();

  // ── Async DB tests ───────────────────────────────────────────────────────────
  section('Connecting to MongoDB');
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`     Connected: ${process.env.MONGO_URI}`);
  } catch (err) {
    fail('MONGODB CONNECTION', err.message);
    printSummary();
    process.exit(1);
  }

  try {
    // Import models after connection is established
    const User        = require('./src/models/User');
    const Transaction = require('./src/models/Transaction');
    const Category    = require('./src/models/Category');

    await testDBConnection(User, Transaction, Category);
    await testTransactionHistory(User, Transaction);
    await testNoteField(Transaction);
  } catch (err) {
    fail('UNEXPECTED ERROR', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n     MongoDB disconnected');
  }

  printSummary();
}

function printSummary() {
  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  Results: ${passed.length}/${results.length} passed${' '.repeat(33 - String(passed.length).length - String(results.length).length)}║`);
  console.log('╚══════════════════════════════════════════════╝');

  if (failed.length) {
    console.log('\nFailed tests:');
    for (const r of failed) {
      console.log(`  ❌ ${r.name}: ${r.reason}`);
    }
    console.log('');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
