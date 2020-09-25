import { helper } from '@ember/component/helper';

export function timeDuration(params) {
  let [currentTime, startTime] = params;
  return Math.floor((currentTime - startTime) / 1000);
}

export default helper(timeDuration);
