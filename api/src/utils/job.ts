export const getJobTime = (start: Date) => {
  const time = Date.now() - start.getTime();
  if (time < 60000) {
    return `${(time / 1000).toFixed(2)}s`;
  }
  return `${Math.floor(time / 60000)}min ${Math.floor((time % 60000) / 1000)}s`;
};
