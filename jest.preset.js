const nxPreset = require("@nx/jest/preset").default

module.exports = {
    ...nxPreset,
    bail: 1,
    silent: false,
    verbose: true
}
