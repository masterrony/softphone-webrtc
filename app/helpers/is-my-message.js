import { helper } from '@ember/component/helper';
import { isEqual } from '@ember/utils';

export function isMyMessage(params) {
  let [from, myPhone] = params;
  return isEqual(from, myPhone);
}

export default helper(isMyMessage);
