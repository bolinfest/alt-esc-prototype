const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/start.js');
const _configFactory = defaults.__get__('configFactory');
const _development = _configFactory('development');
_development.experiments = {
  futureDefaults: true,
};
