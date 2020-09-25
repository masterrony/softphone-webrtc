import { helper } from '@ember/component/helper';
import moment from 'moment';

export function secondsToTime([params]) {
  let duration = moment.duration(params, 'seconds');
  return moment().startOf('day').add(duration).format('HH:mm:ss');
}

export default helper(secondsToTime);
