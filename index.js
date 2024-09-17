/**
 * stimulsoftreport plugin
 * Точка входа плагина
 * Плагин реализует получение данных для отчетов Stimulsoft через адаптеры
 *
 */

const util = require('util');

const app = require('./app');

(async () => {
  let plugin;
  try {
    const opt = getOptFromArgs();
    const pluginapi = opt && opt.pluginapi ? opt.pluginapi : 'ih-plugin-api';
    plugin = require(pluginapi)();
    plugin.log('Stimulsoftreport plugin has started.', 0);

    plugin.params.data = await plugin.params.get();
    plugin.log('Received params ' + JSON.stringify(plugin.params.data));

    app(plugin);
  } catch (e) {
    console.log('ERROR: ' + util.inspect(e));
    plugin.log('ERROR: ' + util.inspect(e));
    setTimeout(() => {
      plugin.exit(1);
    }, 1000);
  }
})();

function getOptFromArgs() {
  let opt;
  try {
    opt = JSON.parse(process.argv[2]); //
  } catch (e) {
    opt = {};
  }
  return opt;
}
