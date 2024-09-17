/*
Stimulsoft.Reports.JS
Version: 2024.3.2
Build date: 2024.07.09
License: https://www.stimulsoft.com/en/licensing/reports
*/

const util = require('util');

const pg = require('pg');

module.exports = function(inObj, plugin) {
  // exports.process = function(command, onResult) {
  let client;
  plugin.log('inObj=' + util.inspect(inObj));
  const { id, command } = inObj;
  /*
  plugin.send({
    id,
    type: 'command',
    response: 1,
    payload: {
      success: true,
      columns: ['ts', 'id', 'val', 'tstz', 'q'],
      rows: [['1717358191253', 153, 0, '2024-06-02T19:56:31.253Z', 0]]
    }
  });
  */
  
  const end = function(result) {
    const respObj = { id, type: 'command' };
    try {
      if (client) client.end();
      result.adapterVersion = '2024.3.2';
      // onResult(result);
      respObj.response = 1;
      respObj.payload = result;
    } catch (e) {
      respObj.response = 0;
      respObj.error = util.inspect(e);
    }
    plugin.send(respObj);
  };

  let onError = function(message) {
    end({ success: false, notice: message });
  };

  try {
    let connect = function() {
      client.connect(error => {
        if (error) onError(error.message);
        else onConnect();
      });
    };

    let query = function(queryString, parameters, maxDataRows) {
      client.query(queryString, parameters, (error, recordset) => {
        if (error) onError(error.message);
        else {
          onQuery(recordset, maxDataRows);
        }
      });
    };

    const onConnect = function() {
      if (command.queryString) {
        if (command.command == 'Execute')
          command.queryString =
            'CALL ' + command.queryString + '(' + command.parameters.map(parameter => '@' + parameter.name).join(', ') + ')';

        let { queryString, parameters } = applyQueryParameters(
          command.queryString,
          command.parameters,
          command.escapeQueryParameters
        );
        query(queryString, parameters, command.maxDataRows);
      } else end({ success: true });
    };

    const onQuery = function(recordset, maxDataRows) {
      let columns = [];
      let rows = [];
      let types = [];

      if (Array.isArray(recordset)) {
        for (let resultIndex of recordset) {
          if (recordset[resultIndex].command == 'SELECT') {
            recordset = recordset[resultIndex];
            break;
          }
        }
      }

      for (let columnIndex in recordset.fields) {
        let column = recordset.fields[columnIndex];
        columns.push(column.name);

        switch (column.dataTypeID) {
          case 16: // BOOL
            types[columnIndex] = 'boolean';
            break;

          case 20: // INT8
          case 21: // INT2
          case 23: // INT4
            types[columnIndex] = 'int';
            break;

          case 700: // FLOAT4
          case 701: // FLOAT8
          case 790: // MONEY
            types[columnIndex] = 'number';
            break;

          case 702: // ABSTIME
          case 1082: // DATE
          case 1114: // TIMESTAMP
            types[columnIndex] = 'datetime';
            break;

          case 1184: // TIMESTAMPTZ
            types[columnIndex] = 'datetimeZ';
            break;

          case 1083: // TIME
            types[columnIndex] = 'time';
            break;

          case 1266: // TIMETZ
            types[columnIndex] = 'timeZ';
            break;

          case 17: // BYTEA
          case 18: // CHAR
          case 19:
          case 24: // REGPROC
          case 25: // TEXT
          case 26: // OID
          case 27: // TID
          case 28: // XID
          case 29: // CID
          case 114: // JSON
          case 142: // XML
          case 194: // PG_NODE_TREE
          case 210: // SMGR
          case 602: // PATH
          case 604: // POLYGON
          case 650: // CIDR
          case 703: // RELTIME
          case 704: // TINTERVAL
          case 718: // CIRCLE
          case 774: // MACADDR8
          case 829: // MACADDR
          case 869: // INET
          case 1033: // ACLITEM
          case 1042: // BPCHAR
          case 1043: // VARCHAR
          case 1186: // INTERVAL
          case 1560: // BIT
          case 1562: // VARBIT
          case 1700: // NUMERIC
          case 1790: // REFCURSOR
          case 2202: // REGPROCEDURE
          case 2203: // REGOPER
          case 2204: // REGOPERATOR
          case 2205: // REGCLASS
          case 2206: // REGTYPE
          case 2950: // UUID
          case 2970: // TXID_SNAPSHOT
          case 3220: // PG_LSN
          case 3361: // PG_NDISTINCT
          case 3402: // PG_DEPENDENCIES
          case 3614: // TSVECTOR
          case 3615: // TSQUERY
          case 3642: // GTSVECTOR
          case 3734: // REGCONFIG
          case 3769: // REGDICTIONARY
          case 3802: // JSONB
          case 4089: // REGNAMESPACE
          case 4096: // REGROLE
          default:
            types[columnIndex] = 'string';
            break;
        }
      }

      if (recordset.rows && recordset.rows.length > 0 && Array.isArray(recordset.rows[0])) recordset.rows = recordset.rows[0];

      for (let recordIndex in recordset.rows) {
        let row = [];
        for (let columnName in recordset.rows[recordIndex]) {
          let columnIndex = columns.indexOf(columnName);
          if (recordset.rows[recordIndex][columnName] instanceof Uint8Array) {
            types[columnIndex] = 'array';
            recordset.rows[recordIndex][columnName] = Buffer.from(recordset.rows[recordIndex][columnName]).toString('base64');
          }

          if (
            recordset.rows[recordIndex][columnName] != null &&
            typeof recordset.rows[recordIndex][columnName].toISOString === 'function'
          ) {
            if (types[columnIndex] == 'datetimeZ') {
              recordset.rows[recordIndex][columnName] = recordset.rows[recordIndex][columnName].toISOString();
            } else {
              let dateTime = new Date(
                recordset.rows[recordIndex][columnName].getTime() -
                  recordset.rows[recordIndex][columnName].getTimezoneOffset() * 60000
              ).toISOString();
              recordset.rows[recordIndex][columnName] = dateTime.replace('Z', '');
              types[columnIndex] = 'datetime';
            }
          }

          if (recordset.rows[recordIndex][columnName] != null && types[columnIndex] == 'timeZ') {
            let time = recordset.rows[recordIndex][columnName];
            let offset = time.substr(time.indexOf('+'));
            if (offset.indexOf(':') == -1) offset += ':00';
            time = time.substr(0, time.indexOf('+'));
            if (time.indexOf('.') == -1) time += '.000';
            recordset.rows[recordIndex][columnName] = '0001-01-01T' + time + offset;
          }

          row[columnIndex] = recordset.rows[recordIndex][columnName];
        }
        if (maxDataRows != null && maxDataRows <= rows.length) break;
        rows.push(row);
      }

      for (let typeIndex in types) {
        if (types[typeIndex] == 'timeZ') types[typeIndex] = 'datetimeoffset';
        if (types[typeIndex] == 'datetimeZ') types[typeIndex] = 'datetime';
      }

      end({ success: true, columns, rows, types });
    };

    let getConnectionStringInfo = function(connectionString) {
      let info = { port: 5432 };

      for (let propertyIndex in connectionString.split(';')) {
        let property = connectionString.split(';')[propertyIndex];
        if (property) {
          let match = property.split(new RegExp('=|:'));
          if (match && match.length >= 2) {
            match[0] = match[0].trim().toLowerCase();
            match[1] = match[1].trim();

            switch (match[0]) {
              case 'data source':
              case 'server':
              case 'host':
                info.host = match[1];
                break;

              case 'port':
                info.port = match[1];
                break;

              case 'database':
              case 'location':
                info.database = match[1];
                break;

              case 'uid':
              case 'user':
              case 'user id':
                info.user = match[1];
                break;

              case 'pwd':
              case 'password':
                info.password = match[1];
                break;

              case 'ssl':
                info.ssl = match[1];
                break;
              case 'sslmode':
                if (match[1] == 'require') info.ssl = 1;
                else if (match[1] == 'disable') info.ssl = 0;
                break;
            }
          }
        }
      }

      return info;
    };

    const applyQueryParameters = function(baseSqlCommand, baseParameters, escapeQueryParameters) {
      let parameters = [];
      let result = '';

      if (baseSqlCommand != null && baseSqlCommand.indexOf('@') > -1) {
        while (baseSqlCommand.indexOf('@') >= 0 && baseParameters != null && baseParameters.length > 0) {
          result += baseSqlCommand.substring(0, baseSqlCommand.indexOf('@'));
          baseSqlCommand = baseSqlCommand.substring(baseSqlCommand.indexOf('@') + 1);

          let parameterName = '';

          while (baseSqlCommand.length > 0) {
            let char = baseSqlCommand.charAt(0);
            if (char.length === 1 && char.match(/[a-zA-Z0-9_-]/i)) {
              parameterName += char;
              baseSqlCommand = baseSqlCommand.substring(1);
            } else break;
          }

          let parameter = baseParameters.find(parameter => parameter.name.toLowerCase() == parameterName.toLowerCase());
          if (parameter) {
            if (parameter.index == null) {
              if (parameter.typeGroup == 'number') parameters.push(+parameter.value);
              else if (parameter.typeGroup == 'datetime') parameters.push(new Date(parameter.value));
              else parameters.push(parameter.value);
              parameter.index = parameters.length;
            }
            // result += '"' + parameter.name + '" := $' + parameter.index.toString();
            result += '$' + parameter.index.toString();
          } else result += '@' + parameterName;
        }
      }

      return { queryString: result + baseSqlCommand, parameters };
    };

    if (command.connectionString.startsWith('postgres://')) {
      let parse = require('pg-connection-string').parse;
      command.connectionStringInfo = parse(command.connectionString);
    } else {
      console.log('INFO: command.connectionString = ' + command.connectionString);
      command.connectionStringInfo = getConnectionStringInfo(command.connectionString);
      console.log('INFO: command.connectionStringInfo = ' + util.inspect(command.connectionStringInfo));
    }

    client = new pg.Client(command.connectionStringInfo);

    connect();
  } catch (e) {
    console.log('ERROR: stiPSQL ' + util.inspect(e));
    onError(e.stack);
  }
  
};
