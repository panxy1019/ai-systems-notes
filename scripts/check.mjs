import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { bandwidthBudget, pipelineSchedule, waitFractionSpeedup } from '../dist/calculations.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
for (const [, id] of html.matchAll(/(?:href|aria-controls)="#?([a-z][\w-]*)"/g)) {
  assert.ok(ids.includes(id), `Missing anchor or control: ${id}`);
}
for (const [, asset] of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)) {
  assert.ok(existsSync(path.join(root, 'dist', asset)), `Missing asset: ${asset}`);
}
for (const section of ['overview','storage','access','gds','threefs','architecture','monitor','pipeline','tools','profiling','takeaways','quiz','faq','references']) {
  assert.ok(ids.includes(section), `Missing learning section: ${section}`);
}
assert.equal((html.match(/class="quiz-question"/g) || []).length, 6);
assert.ok(!/wxid_|xwechat_files|chapter5-extracted|PRIVATE KEY/.test(html), 'Private source paths must not ship');
const budget = bandwidthBudget(8, 200, 1.5);
assert.equal(budget.raw, 1.6);
assert.ok(Math.abs(budget.target - 2.4) < 1e-12);
assert.throws(() => bandwidthBudget(0, 200, 1.5), RangeError);
assert.throws(() => bandwidthBudget(1.5, 200, 1.5), RangeError);
assert.ok(Math.abs(waitFractionSpeedup(.3, .05) - 1.357142857142857) < 1e-12);

// Verify the model for one batch, equal stages, and bottlenecks in each position.
for (const durations of [[12,8,5,25], [5,5,5,5], [60,2,2,2], [2,60,2,2], [2,2,60,2], [2,2,2,60]]) {
  for (const batches of [1,5,10]) {
    const result = pipelineSchedule(durations, batches, true);
    const sum = durations.reduce((a,b) => a+b, 0);
    assert.equal(result.total, sum + (batches-1)*Math.max(...durations));
    assert.equal(pipelineSchedule(durations,batches,false).total, sum*batches);
    for (const job of result.jobs) {
      if (job.stage > 0) {
        const previous = result.jobs.find(other => other.batch === job.batch && other.stage === job.stage-1);
        assert.ok(job.start >= previous.end, 'A stage cannot consume unfinished data');
      }
      if (job.batch > 1) {
        const previous = result.jobs.find(other => other.stage === job.stage && other.batch === job.batch-1);
        assert.ok(job.start >= previous.end, 'The same resource cannot process two batches simultaneously');
      }
    }
  }
}
const normal = pipelineSchedule([12,8,5,25]);
assert.equal(normal.total,150);
assert.equal(normal.serialTotal,250);
execFileSync(process.execPath, ['--check', path.join(root, 'dist/app.js')]);
execFileSync(process.execPath, ['--check', path.join(root, 'scripts/serve.mjs')]);
console.log('Passed: local assets, anchors, 14 learning sections, 6 quiz questions, bandwidth units, finite pipeline scheduling, and JavaScript syntax.');
