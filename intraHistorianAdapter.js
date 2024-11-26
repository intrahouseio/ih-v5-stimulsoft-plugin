/*
 * IntraHistorian Adapter
 */

const util = require('util');
const fs = require('fs');
const qs = require('querystring');

const utils = require('./lib/utils');
const rollup = require('./lib/rollup2');
const dateutils = require('./lib/dateutils');

module.exports = async function(inObj, plugin) {
  let client;
  plugin.log('IntraHistorian inObj=' + util.inspect(inObj));
  const { id, command } = inObj;

  plugin.log('plugin.params.data=' + util.inspect(plugin.params.data));
  const { agentName, agentPath, customFolder, jbaseFolder, useIds, ...opt } = plugin.params.data;

  // Для sqlite - добавить пути к hist.db и log.db
  if (agentName == 'sqlite') checkPath();

  const finish = function(result) {
    const respObj = { id, type: 'command' };
    try {
      if (client) client.close();
      result.adapterVersion = '2024.3.2';
      // onResult(result);
      respObj.response = 1;
      respObj.payload = result;
    } catch (e) {
      respObj.response = 0;
      respObj.error = util.inspect(e);
    }
    plugin.log('SEND ' + util.inspect(respObj));
    plugin.send(respObj);
  };

  try {
    // Подключиться к БД
    const sqlclientFilename = agentPath + '/lib/sqlclient.js';
    if (!fs.existsSync(sqlclientFilename)) throw { message: 'File not found: ' + sqlclientFilename };
    const Client = require(sqlclientFilename);
    client = new Client(opt);
    await client.connect();
    plugin.log('Connected to ' + agentName);
    console.log('inObj = ' + util.inspect(inObj));
    let data = [];
    if (command.queryString) {
      if (command.queryString.startsWith('select')) {
        data = await client.query(command.queryString);
      } else if (command.queryString.startsWith('table')) {
        data = await getRes(command.queryString, command.parameters);
      }
      console.log('data = ' + util.inspect(data));

      finish({ success: true, data });
    } else {
      finish({ success: true });
    }
  } catch (e) {
    console.log('ERROR: stimulsoftreport ' + util.inspect(e));
    finish({ success: false, notice: 'CATCH ' + util.inspect(e) });
  }

  function checkPath() {
    if (command.queryString && command.queryString.indexOf('mainlog') > 0) {
      opt.dbPath = getLogdbPath(opt.dbPath);
      console.log('opt.dbPath = ' + opt.dbPath);
    }
  }

  function getLogdbPath(pathToDb) {
    // /var/lib/intrascada/projects/orion_06052024/db/hist.db =>
    // /var/lib/intrascada/projects/orion_06052024/logdb/log.db
    if (!pathToDb) return '';
    return pathToDb.trim().substr(0, pathToDb.length - 10) + 'logdb/log.db';
  }

  async function getRes(queryString, parameters) {
    // Подготовить запрос или запрос уже готов
    // queryString = table=records;vars=temp1#AI_001.value#last#0,temp2#AI_002.value#last#0;dateformat=
    try {
      if (!parameters || typeof parameters != 'object') throw { message: 'Expect parameters!' };
      plugin.log('parameters = ' + util.inspect(parameters));
      const parObj = utils.parseParameters(parameters);

      const query = qs.parse(queryString, ';');

      // Если дни - нужно перевести с 00 00 по 23.59.59
      let start = parObj.startdatetime.ts;
      let end = parObj.enddatetime.ts;
      if (query.period_type != 'DateAndTime') {
        start = dateutils.getZeroTimeOfDay(parObj.startdatetime.ts);
        end = dateutils.getLastTimeOfDay(parObj.enddatetime.ts);
      }

      // const end = Date.now();
      // const start = Date.now() - 3600000;

      if (!start) throw { message: 'Expect startdatetime in parameters!' };
      if (!end) throw { message: 'Expect enddatetime in parameters!' };

      // {table:'records', vars='temp1#AI...',dtformat:'',discrete:'min'}
      if (!query.table) throw { message: 'Expect table!' };
      if (!query.vars) throw { message: 'Expect vars!' };

      const reportVars = utils.formReportVars(query.vars);
      query.dn_prop = utils.formDn_prop(reportVars);

      query.end = end;
      query.start = start;

      const sqlStr = client.prepareQuery(query, false);

      plugin.log('SQL: ' + sqlStr);

      // Выполнить запрос
      let arr = [];
      if (sqlStr) {
        arr = await client.query(sqlStr);
      }

      // результат преобразовать в массив объектов
      // внутри объекта - переменные отчета со значениями
      plugin.log('discrete: ' + query.discrete);

      const mes = {
        discrete: query.discrete,
        reportVars,
        filter: { start, end },
        reportDateformat: query.dtformat || 'reportdt',
        group: query.group
      };

      if (arr && arr.length && mes.reportVars && mes.reportVars.length) {
        return rollup(arr, mes);
      }
    } catch (e) {
      plugin.log('ERROR: ' + e.message + '.  queryString = ' + queryString);
      return [];
    }
  }
};
