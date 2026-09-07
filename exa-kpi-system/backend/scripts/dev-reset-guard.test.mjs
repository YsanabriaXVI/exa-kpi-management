import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertDevelopmentReset,databases} from './dev-reset-guard.mjs';
const env={NODE_ENV:'development',ALLOW_DEV_DATABASE_RESET:'true'};
const fixture=()=>({name:'exa-kpi-backend',services:{mysql:{image:'mysql:8.4'},...Object.fromEntries(Object.entries(databases).map(([s,d])=>[s,{build:{dockerfile:'Dockerfile.dev'},environment:{NODE_ENV:'development',DATABASE_URL:`mysql://dev:dev@mysql:3306/${d}`}}]))}});
test('accepts only explicit local development',()=>assert.doesNotThrow(()=>assertDevelopmentReset(fixture(),env,'npipe:////./pipe/dockerDesktopLinuxEngine')));
test('rejects absent consent, production, remote targets and mismatched databases',()=>{
  for(const overrides of [{ALLOW_DEV_DATABASE_RESET:''},{NODE_ENV:'production'},{NODE_ENV:'test'},{DOCKER_HOST:'tcp://remote:2375'}]) assert.throws(()=>assertDevelopmentReset(fixture(),{...env,...overrides},'unix:///var/run/docker.sock'));
  assert.throws(()=>assertDevelopmentReset(fixture(),env,'ssh://production'));
  for(const url of ['mysql://dev:dev@prod:3306/exa_monitoring','mysql://prod:dev@mysql:3306/exa_monitoring','mysql://dev:dev@mysql:3306/exa_monitoring_prod']) {
    const config=fixture();config.services['exa-monitoring-service'].environment.DATABASE_URL=url;
    assert.throws(()=>assertDevelopmentReset(config,env,'unix:///var/run/docker.sock'));
  }
  const config=fixture();config.services['exa-monitoring-service'].environment.NODE_ENV='production';
  assert.throws(()=>assertDevelopmentReset(config,env,'unix:///var/run/docker.sock'));
});
