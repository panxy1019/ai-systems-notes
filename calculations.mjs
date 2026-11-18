// All values in these calculators are teaching assumptions, not benchmarks.
export function bandwidthBudget(gpus, megabytesPerSecond, headroom) {
  if (![gpus, megabytesPerSecond, headroom].every(Number.isFinite) ||
      !Number.isInteger(gpus) || gpus < 1 || megabytesPerSecond <= 0 || headroom < 1) {
    throw new RangeError('请输入有效的 GPU 数、读取速率和余量系数');
  }
  const raw = gpus * megabytesPerSecond / 1000;
  return { raw, target: raw * headroom };
}

export function pipelineSchedule(durations, batches = 5, overlap = true) {
  if (durations.length !== 4 || !durations.every(t => Number.isFinite(t) && t > 0) ||
      !Number.isInteger(batches) || batches < 1) {
    throw new RangeError('流水线需要四个正数耗时和正整数批数');
  }
  const sum = durations.reduce((a, b) => a + b, 0);
  const longest = Math.max(...durations);
  const jobs = [];
  const stageEnd = [0, 0, 0, 0];
  for (let batch = 0; batch < batches; batch++) {
    let previousStageEnd = overlap ? 0 : batch * sum;
    durations.forEach((duration, stage) => {
      const start = overlap ? Math.max(stageEnd[stage], previousStageEnd) : previousStageEnd;
      const end = start + duration;
      jobs.push({ stage, batch: batch + 1, start, end });
      stageEnd[stage] = end;
      previousStageEnd = end;
    });
  }
  return { jobs, serialPerBatch: sum, steady: longest,
    total: stageEnd[3], serialTotal: sum * batches,
    bottlenecks: durations.flatMap((t, i) => t === longest ? [i] : []) };
}

export function waitFractionSpeedup(oldFraction, newFraction) {
  if (![oldFraction, newFraction].every(x => Number.isFinite(x) && x >= 0 && x < 1)) {
    throw new RangeError('等待比例必须在 0 到 1 之间');
  }
  return (1 - newFraction) / (1 - oldFraction);
}
