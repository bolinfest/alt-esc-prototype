const rewire = require('rewire');
const defaults = rewire('react-scripts/scripts/build.js');
const _configFactory = defaults.__get__('configFactory');
const _development = _configFactory('production');
_development.experiments = {
  futureDefaults: true,
};
