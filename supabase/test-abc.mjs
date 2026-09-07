import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const db = new PGlite();
try {
  await db.exec(`CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
  for (const file of ['20240711000000_initial_schema.sql', '20260905000000_complete_abc.sql']) {
    await db.exec(await readFile(new URL('./migrations/' + file, import.meta.url), 'utf8'));
  }
  await db.exec(`GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    INSERT INTO auth.users VALUES ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
    SET ROLE authenticated;
    SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';`);
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const period = await scalar("SELECT open_abc_period('2026-09-01')");
  assert.equal((await scalar("SELECT open_abc_period('2026-09-17')")).id, period.id);
  const add = (table, name, cost) => scalar(`INSERT INTO ${table}(name, company_id, period_id${cost === undefined ? '' : ', total_cost'}) VALUES ($1,$2,$3${cost === undefined ? '' : ',$4'}) RETURNING id`, cost === undefined ? [name, period.company_id, period.id] : [name, period.company_id, period.id, cost]);
  const resource = await add('resources', 'Electricidad', 100.01);
  const a = await add('activities', 'Producción');
  const b = await add('activities', 'Control');
  const p = await add('cost_objects', 'Producto');
  const q = await add('cost_objects', 'Producto'); // Equal labels must not merge distinct products.
  const save = (kind, source, rows) => db.query('SELECT save_abc_distributions($1,$2,$3)', [kind, source, JSON.stringify(rows)]);
  const calculate = () => db.query('SELECT calculate_abc_period($1)', [period.id]);
  await assert.rejects(calculate(), /100%/);
  await save('resource', resource, [{ activity_id: a, percentage: 0.3333 }, { activity_id: b, percentage: 0.6667 }]);
  await save('activity', a, [{ cost_object_id: p, percentage: 0.5 }, { cost_object_id: q, percentage: 0.5 }]);
  await save('activity', b, [{ cost_object_id: p, percentage: 1 }]);
  await calculate();
  assert.equal(Number(await scalar('SELECT sum(assigned_cost) FROM resource_distributions')), 100.01);
  assert.equal(Number(await scalar('SELECT sum(assigned_cost) FROM activity_distributions')), 100.01);
  assert.equal(Number(await scalar('SELECT assigned_cost FROM resource_distributions WHERE activity_id=$1', [a])), 33.33);
  await calculate();
  assert.equal(Number(await scalar('SELECT sum(assigned_cost) FROM activity_distributions')), 100.01);
  console.log('PASS: migrations, period reuse, two-stage calculation, rounding and repeatability');

  await assert.rejects(save('resource', resource, [{ activity_id: a, percentage: 1.1 }]));
  await assert.rejects(save('resource', resource, [{ activity_id: '99999999-9999-9999-9999-999999999999', percentage: 1 }]));
  assert.equal(Number(await scalar('SELECT count(*) FROM resource_distributions')), 2);
  assert.equal(Number(await scalar('SELECT sum(assigned_cost) FROM activity_distributions')), 100.01);
  await save('resource', resource, []);
  assert.equal(Number(await scalar('SELECT count(*) FROM resource_distributions')), 0);
  assert.equal(Number(await scalar('SELECT count(*) FROM activity_distributions WHERE assigned_cost IS NOT NULL')), 0);
  await assert.rejects(calculate(), /100%/);
  console.log('PASS: rollback on failure, empty replacement and result invalidation');

  const otherPeriod = await scalar("SELECT open_abc_period('2026-10-01')");
  const otherActivity = await scalar('INSERT INTO activities(name,company_id,period_id) VALUES ($1,$2,$3) RETURNING id', ['October', period.company_id, otherPeriod.id]);
  await assert.rejects(save('resource', resource, [{ activity_id: otherActivity, percentage: 1 }]));
  await db.exec("SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222'");
  assert.equal(Number(await scalar('SELECT count(*) FROM resources')), 0);
  assert.equal(Number(await scalar('SELECT count(*) FROM companies')), 0);
  await assert.rejects(calculate(), /disponible/);
  await assert.rejects(save('resource', resource, []), /disponible/);
  const second = await scalar("SELECT open_abc_period('2026-09-01')");
  assert.notEqual(second.company_id, period.company_id);
  await assert.rejects(db.query('INSERT INTO resources(name,company_id,period_id) VALUES ($1,$2,$3)', ['Intrusion', period.company_id, period.id]));
  console.log('PASS: user isolation, cross-period assignment rejection and unauthorized write rejection');
} finally {
  await db.close();
}
