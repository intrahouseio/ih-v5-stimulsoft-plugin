/**
 *  utils.js
 */
const util = require('util');

/**
   * 
   * @param {String} avars 
   *   temp1#AI_001.value#last#0,temp2#AI_002.value#last#0
   * @return [
      { varname: 'temp1', dn_prop: 'AI_001.value', calc_type: 'last', decdig: 0,  col_type: 'value' },
      { varname: 'temp2', dn_prop: 'AI_002.value', calc_type: 'last', decdig: 0,  col_type: 'value' }
    ]
   * throw on error 
   */
function formReportVars(avars) {
  const result = [];

  const arr = avars.split(',');
  if (!arr || !arr.length) throw { message: 'Failed split vars:' + avars };

  arr.forEach(el => {
    const one = el.trim();
    if (one) {
      const items = one.split('#');
      if (items && items.length > 1) {
        const oneVar = { varname: items[0].trim(), dn_prop: items[1].trim(), calc_type: '', decdig: 0, col_type: 'value' };
        if (items.length > 2) oneVar.calc_type = items[2].trim();
        if (items.length > 3 && !isNaN(Number(items[3]))) oneVar.decdig = Number(items[3]);
        result.push(oneVar);
      }
    }
  });
  return result;
}

/**
 *
 * @param {Array of Objects} reportVars
 *         [{ varname: 'temp1', dn_prop: 'AI_001.value', calc_type: 'last', decdig: 0,  col_type: 'value' },...]
 * @return {String}  dn_prop
 *         'AI_001.value,AI_002.value'
 * throw on error
 */
function formDn_prop(reportVars) {
  const arr = reportVars.map(item => item.dn_prop);
  return arr.join(',');
}

/**
 *
 * @param {Array of Objects} parameters
 *         [ {name: "startdatetime", value: "2024-09-10 05:08:16", type: 4, typeName: "DateTime", typeGroup: "",…}
 * @return {Object}  {
 *        startdatetime: {value: "2024-09-10 05:08:16",ts,.. }
 *        enddatetime: {value: "2024-09-11 05:08:16",ts,..},
 *        ...
 *      }
 *         
 * throw on error
 */
function parseParameters(parameters) {
  const resObj = {};
  parameters.forEach(item => {
    resObj[item.name] = item;
    if (item.typeName == 'DateTime' || item.typeName == 'Date') {
      const dt = new Date(item.value);
      resObj[item.name].ts = dt.getTime();
    }
  })
  return resObj;
}

function getShortErrStr(e) {
  if (typeof e == 'object') return e.message ? getErrTail(e.message) : JSON.stringify(e);
  if (typeof e == 'string') return e.indexOf('\n') ? e.split('\n').shift() : e;
  return String(e);

  function getErrTail(str) {
    let idx = str.lastIndexOf('error:');
    return idx > 0 ? str.substr(idx + 6) : str;
  }
}

function getDateStr() {
  const dt = new Date();
  return (
    pad(dt.getDate()) +
    '.' +
    pad(dt.getMonth() + 1) +
    ' ' +
    pad(dt.getHours()) +
    ':' +
    pad(dt.getMinutes()) +
    ':' +
    pad(dt.getSeconds()) +
    '.' +
    pad(dt.getMilliseconds(), 3)
  );
}

function pad(str, len = 2) {
  return String(str).padStart(len, '0');
}

module.exports = {
  formReportVars,
  formDn_prop,
  parseParameters,
  getShortErrStr,
  getDateStr
};
