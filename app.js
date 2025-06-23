/**
 * app.js
 * Реализует получение данных через адаптеры по запросу
 *
 */
const util = require('util');

const index_adapters = require('./index_adapters');
const intraHistorianAdapter = require('./intraHistorianAdapter');

module.exports = async function(plugin) {
  plugin.onCommand(async mes => {
    plugin.log('stimulsoftreport plugin get mes=' + util.inspect(mes));
    if (mes.id && mes.command) {
      const database = mes.command.database;

      if (database == 'IntraHistorian') {
        fromIntraHistorian(mes);
      } else {
        index_adapters.process(mes.command, onResult);
        // plugin.send({ id: mes.id, type: 'command', response: 0, error: 'Unknown database ' + database });
      }
    } else {
      plugin.send({ id: mes.id, type: 'command', response: 0, error: 'Expected id and command!' });
    }

    function onResult(result) {
      if (result.success) {
        plugin.send({ id: mes.id, type: 'command', response: 1, payload: result });
      } else {
        plugin.send({ id: mes.id, type: 'command', response: 0, error: result.notice});
      }
    }
  });

  function fromIntraHistorian(inObj) {
    const { id, command } = inObj;
    const cmd = command.command;
    if (cmd == 'RetrieveData') {
      intraHistorianAdapter(inObj, plugin);
    } else if (cmd == 'RetrieveSchema') {
      const payload = { success: true, types: getTypes() };
      plugin.send({ id, type: 'command', response: 1, payload });
    } else {
      plugin.send({ id, type: 'command', response: 0, error: 'Unknown command ' + cmd });
    }
  }

  function getTypes() {
    return {
      mainlog: {
        tags: 'string',
        did: 'string',
        location: 'string',
        txt: 'string',
        level: 'number',
        ts: 'number',
        sender: 'string'
      },

      records: {
        dn: 'string',
        prop: 'string',
        ts: 'number',
        val: 'number'
      }
    };
  }

  function getData() {
    return {
      rows: [
        ['value1', 1],
        ['value2', 2],
        ['value3', 3]
      ],
      columns: ['Column1', 'Column2'],
      types: ['string', 'number']
    };
  }

  // Вариант 2
  function getData2() {
    return {
      data: [
        { Column1: 'value1', Column2: 1 },
        { Column1: 'value2', Column2: 2 },
        { Column1: 'value3', Column2: 3 }
      ]
    };
  }
};
/**
{
  command: 'RetrieveSchema',
  connectionString: '111',
  database: 'IntraHistorian',
  queryString: null,
  dataSource: null,
  headers: [],
  parameters: [],
  timeout: 30000,
  connection: null,
  withCredentials: false,
  escapeQueryParameters: true,
  maxDataRows: null
}
*/
//  Postgres
/*
 command: {
    command: 'ExecuteQuery',
    connectionString: 'User=ih_user;Password=ih_password;Host=localhost;Port=5432;Database=ihdb;',
    queryString: 'select * from mainlog limit 10',
    database: 'PostgreSQL',
    parameters: [],
    timeout: 30000,
    dataSource: 'mainlog',
    connection: 'IntraScada Historian',
    escapeQueryParameters: true,
    maxDataRows: null,
    rnd: 0.557122726154228,
    encryptResult: true
  },
  id: '7xPQeethP',
  type: 'command'
}
*/
