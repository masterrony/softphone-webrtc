import { helper } from '@ember/component/helper';
import moment from 'moment';

export function dateFormat([params]) {
  return moment(params).fromNow();
}

export default helper(dateFormat);
