export const databases = {
  'exa-kpi-management-service': 'exa_kpi_management',
  'exa-kpi-pool-service': 'exa_kpi_pool',
  'exa-scorecards-service': 'exa_scorecard',
  'exa-monitoring-service': 'exa_monitoring',
};
export function assertDevelopmentReset(config, env, endpoint) {
  if (env.NODE_ENV !== 'development' || env.ALLOW_DEV_DATABASE_RESET !== 'true')
    throw new Error('Reset requires NODE_ENV=development and ALLOW_DEV_DATABASE_RESET=true');
  if (!/^(npipe:\/\/|unix:\/\/)/.test(endpoint) || env.DOCKER_HOST && env.DOCKER_HOST !== endpoint)
    throw new Error('Reset requires a local Docker socket; remote Docker is forbidden');
  if (config.name !== 'exa-kpi-backend' || !/^mysql:8\./.test(config.services?.mysql?.image ?? ''))
    throw new Error('Unrecognized development Compose project / MySQL service');
  if (config.services.mysql.volumes?.some(v => v.target === '/var/lib/mysql' && (v.type !== 'volume' || v.source !== 'mysql_data')))
    throw new Error('Unrecognized database storage');
  if (config.volumes?.mysql_data?.external) throw new Error('External database volumes are forbidden');
  for (const [service, database] of Object.entries(databases)) {
    const entry = config.services?.[service];
    const settings = entry?.environment ?? {};
    if (settings.NODE_ENV !== 'development') throw new Error(`${service}: not DEVELOPMENT`);
    const url = new URL(settings.DATABASE_URL);
    if (url.protocol !== 'mysql:' || url.hostname !== 'mysql' || url.port !== '3306' || url.pathname !== `/${database}` || url.search)
      throw new Error(`${service}: database is not the allowlisted local development target`);
    if (/prod|staging|live/i.test(decodeURIComponent(url.username))) throw new Error(`${service}: production identity rejected`);
    if (!entry.build?.dockerfile?.endsWith('Dockerfile.dev')) throw new Error(`${service}: development build required`);
    if (settings.NATS_URL && settings.NATS_URL !== 'nats://nats:4222') throw new Error('External event broker forbidden');
  }
}
