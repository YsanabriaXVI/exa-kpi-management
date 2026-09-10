const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const clients = {};
for (const [key, folder] of Object.entries({ management: 'exa-kpi-management-service', pool: 'exa-kpi-pool-service', scorecards: 'exa-scorecards-service', monitoring: 'exa-monitoring-service' })) {
  const base = path.join(root, 'backend', folder);
  const env = require(path.join(base, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(base, '.env')));
  const { PrismaClient } = require(path.join(base, 'node_modules/@prisma/client'));
  clients[key] = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
}
const json = value => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item, 2);
(async () => {
  const inventory = {
    pools: await clients.pool.kpiPool.findMany({ select: { id: true, poolCode: true, poolName: true, statusCode: true, validFrom: true, validTo: true } }),
    scorecards: await clients.scorecards.scorecard.findMany({ select: { id: true, scorecardCode: true, scorecardName: true, kpiPoolExternalId: true } }),
    definitions: await clients.management.kpiDefinition.findMany({ select: { id: true, kpiCode: true, kpiName: true, description: true } }),
    configurations: await clients.management.kpiConfiguration.findMany({ select: { id: true, configCode: true, kpiDefinitionId: true } }),
    periods: await clients.monitoring.monitoringPeriod.findMany({ select: { id: true, kpiPoolExternalId: true, poolCodeSnapshot: true, poolNameSnapshot: true, periodKey: true } }),
  };
  fs.writeFileSync(path.join(__dirname, 'test-data-inventory.json'), json(inventory));
  console.log(json(inventory));
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { for (const client of Object.values(clients)) await client.$disconnect(); });
