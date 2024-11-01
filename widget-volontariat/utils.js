export function datePosted(date) {
  if (!date) return ``;
  const year = date.getFullYear();
  const month = twoDigitTransform(date.getMonth() + 1);
  const monthDay = twoDigitTransform(date.getDate());

  return `${year}-${month}-${monthDay}`;
}

export function validThrough(date) {
  if (!date) return ``;
  const hours = twoDigitTransform(date.getHours());
  const minutes = twoDigitTransform(date.getMinutes());

  return `${datePosted(date)}T${hours}:${minutes}`;
}

export function twoDigitTransform(num) {
  if (num < 10) return `0${num}`;
  return `${num}`;
}
