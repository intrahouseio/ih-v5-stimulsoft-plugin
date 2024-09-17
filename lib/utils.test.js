/* eslint-disable */
const util = require('util');

const expect = require('expect.js');

const test = require('./utils');


describe('utils', () => {
  describe('formReportVars', () => {
    it('input is ok', () => {

      const res = test.formReportVars('temp1#AI_001.value#last#0,temp2#AI_002.value#last#0');
      console.log(res);
      expect(Array.isArray(res)).to.eql(true);

      const dn_prop = test.formDn_prop(res);
      console.log(dn_prop);
      expect(dn_prop).to.eql('AI_001.value,AI_002.value');
    });
  });
});
