import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertDevelopmentReset, databases } from './dev-reset-guard.mjs';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const docker = (args, input) => execFileSync('docker', args, {cwd, input, encoding:'utf8', maxBuffer:16*1024*1024});
const compose = (args, input) => docker(['compose','-f','docker-compose.yml',...args],input);
const run = args => { console.log(`Running: docker compose ${args.join(' ')}`); console.log(compose(args)); };
const config = JSON.parse(compose(['config','--format','json']));
const context = JSON.parse(docker(['context','inspect']))[0];
assertDevelopmentReset(config, process.env, context.Endpoints.docker.Host);
// Inspect actual containers too: do not trust a frontend flag or only the YAML.
for (const service of ['mysql','nats',...Object.keys(databases)]) {
  const id = compose(['ps','-aq',service]).trim();
  if (!id) throw new Error(`Start the local development stack before reset: ${service} missing`);
  const actual = JSON.parse(docker(['inspect',id]))[0];
  if (actual.Config.Labels['com.docker.compose.project'] !== config.name || actual.Config.Labels['com.docker.compose.service'] !== service)
    throw new Error(`Unrecognized running target: ${service}`);
  if (databases[service]) {
    const settings=Object.fromEntries(actual.Config.Env.map(item=>{const i=item.indexOf('=');return [item.slice(0,i),item.slice(i+1)];}));
    if (settings.NODE_ENV !== 'development' || settings.DATABASE_URL !== config.services[service].environment.DATABASE_URL)
      throw new Error(`${service}: actual database/environment differs from guarded configuration`);
  }
}
const sql = "SELECT TABLE_SCHEMA, COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA IN ('exa_access','exa_reporting') GROUP BY TABLE_SCHEMA;";
const reserved = compose(['exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --skip-column-names'],sql).trim();
if (reserved) throw new Error('Access/Reporting contain tables without a canonical migration/seed workflow. Refusing reset until their ownership is established.');
console.log('Verified DEVELOPMENT: local Docker, four allowlisted MySQL databases. Access/Reporting have no tables and are preserved.');
if (process.argv.includes('--check')) { console.log('Preflight only: no data changed.'); process.exit(0); }
run(['stop',...Object.keys(databases)]);
// Database reset alone is insufficient: durable events could restore stale IDs
// into the rebuilt projections. Remove only this application's three streams.
console.log(compose(['run','--rm','-T','--no-deps','-e','ALLOW_DEV_DATABASE_RESET=true','exa-kpi-pool-service','node','--input-type=module'],`
import {connect} from 'nats';
if(process.env.NODE_ENV!=='development'||process.env.ALLOW_DEV_DATABASE_RESET!=='true'||process.env.NATS_URL!=='nats://nats:4222') throw Error('Unsafe event reset');
const nc=await connect({servers:process.env.NATS_URL});
try {const js=await nc.jetstreamManager();const known=['EXA_KPI_POOL_EVENTS','SCORECARD_EVENTS','MONITORING_EVENTS'];for await(const s of js.streams.list()){if(known.includes(s.config.name)){await js.streams.delete(s.config.name);console.log('Removed disposable stream '+s.config.name);}}} finally {await nc.close();}
`));
for (const service of Object.keys(databases)) {
  run(['run','--rm','-T','--no-deps',service,'npx','prisma','validate']);
  run(['run','--rm','-T','--no-deps',service,'npx','prisma','migrate','reset','--force','--skip-seed','--skip-generate']);
  run(['run','--rm','-T','--no-deps',service,'npm','run','prisma:generate']);
  run(['run','--rm','-T','--no-deps',service,'npm','run','prisma:seed']);
}
run(['up','-d',...Object.keys(databases)]);
// Management must be ready before projecting its canonical frequency IDs.
let ready=false;
for(let attempt=0;attempt<60;attempt++) {
  try {const response=await fetch('http://localhost:4001/api/v1/internal/input-frequencies');if(response.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
}
if(!ready) throw new Error('Management did not become ready after rebuild');
run(['exec','-T','-e','KPI_MANAGEMENT_BASE_URL=http://exa-kpi-management-service:4001','exa-kpi-pool-service','npm','run','sync:input-frequencies']);
console.log('Development reset complete. Structural catalogs only; run the documented modern smoke separately.');
