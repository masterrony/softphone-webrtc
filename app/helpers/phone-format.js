import { helper } from '@ember/component/helper';

export function phoneFormat([params]) {
  params = params || '';
  if (params.startsWith('+') && !params.startsWith('+1')) {
    //display international numbers as written
  }
  else if (params.startsWith('+1')) {
    params = params.slice(2);
  }
  else if (params.startsWith('1') && params.length > 10) {
    params = params.slice(1);
  }
  else if (/\+?\d{10}/.test(params)) {
    params = `${params.slice(0, 3)}-${params.slice(3, 6)}-${params.slice(6)}`;
  }
  return params;
}

export default helper(phoneFormat);
