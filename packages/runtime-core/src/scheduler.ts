const resolvedPromise = Promise.resolve();

export function queueJob(job: (...args: any[]) => any) {
  resolvedPromise.then(() => {
    job();
  });
}

export async function nextTick<R>(fn: (...args: any[]) => R): Promise<R> {
  return resolvedPromise.then(() => fn.call(this));
}
