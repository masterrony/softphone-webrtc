import { helper } from '@ember/component/helper';

export function nameFormat([params]) {
  params = params || '';
  return params.split(';').join(' ');
}

export default helper(nameFormat);
