import assert from 'node:assert/strict';
// Run after dev-reset.mjs; this fixture uses only the public application APIs.
if(process.env.NODE_ENV!=='development'||process.env.ALLOW_DEV_DATABASE_RESET!=='true') throw Error('Development smoke requires explicit development consent');
const started=new Date();
const roots={management:'http://localhost:4001/api/v1',pool:'http://localhost:4002/api/v1',scorecard:'http://localhost:4003/api/v1',monitoring:'http://localhost:4004/api/v1'};
async function api(service,path,body,method=body===undefined?'GET':'POST') {
  const response=await fetch(roots[service]+path,{method,headers:{'Content-Type':'application/json','x-user-id':'1'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const value=await response.json();if(!response.ok) throw Error(`${method} ${service}${path}: ${response.status} ${JSON.stringify(value)}`);
  return value;
}
const unwrap=r=>r.data??r;
const pause=()=>new Promise(r=>setTimeout(r,1000));
const configurationLookups=unwrap(await api('management','/kpi-configurations/lookups'));
const poolLookups=unwrap(await api('pool','/kpi-pools/lookups'));
const existing=await api('management','/kpi-definitions');
assert(existing.data.every(d=>d.kpiName.startsWith('DEV Smoke ')),'Smoke requires reset data or its own partial fixture');
console.log(`Existing smoke definitions: ${existing.meta.totalItems}; no legacy definitions`);
const categories=unwrap(await api('management','/kpi-categories'));
const category=(Array.isArray(categories)?categories:categories.items)[0];
const subjects=configurationLookups.subjectCatalogs.filter(s=>s.subjectType==='EMPLOYEE').slice(0,2).map(s=>({subjectExternalId:s.id,subjectCode:s.code,subjectLabel:s.name}));
const base={goal:100,measurementUnit:'USD',goalUnit:'USD',dataSource:'Manual Entry',inputFrequencyCode:'MONTHLY',effectiveFrom:'2023-01-01',
  ranges:{redFrom:0,redTo:64,yellowFrom:65,yellowTo:79,greenFrom:80,greenTo:100},
  periodScope:'CURRENT_PERIOD',evaluationTypeCode:'GREATER_IS_BETTER',resultSemantics:'ABSOLUTE_VALUE',
  scoringMethod:'PROPORTIONAL',scoringRuleConfig:{floorPercent:0,capPercent:100},scoringRuleConfigVersion:1,negativeResultPolicy:'DISALLOW',scoringApprovalStatus:'APPROVED'};
const variants={
  A:{},B:{evaluationTypeCode:'LOWER_IS_BETTER'},
  // Existing public V1 zero-target contract uses LOWER_IS_BETTER + bands.
  C:{goal:0,measurementUnit:'incidents',goalUnit:'incidents',evaluationTypeCode:'LOWER_IS_BETTER',scoringMethod:'ZERO_TARGET_BANDS',scoringRuleConfig:{bands:[{minResult:0,maxResult:0,compliance:100},{minResult:1,compliance:0}]}},
  D:{evaluationScope:'BY_SUBJECT',subjectType:'EMPLOYEE',subjects,goalAssignment:'SAME_GOAL_FOR_ALL'},
  E:{goal:10,goalUnit:'%',periodScope:'PREVIOUS_PERIOD',comparisonDirection:'INCREASE',targetKind:'CHANGE_TARGET'},
  F:{goal:10,goalUnit:'%',periodScope:'SAME_PERIOD_PREVIOUS_YEAR',comparisonDirection:'INCREASE',targetKind:'CHANGE_TARGET'},
};
const configs={};
for(const [letter,variant] of Object.entries(variants)) {
  const definition=existing.data.find(d=>d.kpiName===`DEV Smoke ${letter}`)??unwrap(await api('management','/kpi-definitions',{kpiName:`DEV Smoke ${letter}`,description:'Modern development contract smoke fixture',kpiCategoryId:String(category.id),isActive:true}));
  const prior=unwrap(await api('management','/kpi-configurations'));
  configs[letter]=prior.find(c=>Number(c.id)>0&&String(c.definitionId)===String(definition.id))??unwrap(await api('management','/kpi-configurations',{...base,...variant,definitionId:String(definition.id)}));
  console.log(`Created modern KPI ${letter}: ${configs[letter].id}`);
}
async function newPool(name,start,end,letters) {
  const pools=unwrap(await api('pool','/kpi-pools'));
  const pool=pools.find(p=>p.poolName===`DEV Smoke ${name}`)??unwrap(await api('pool','/kpi-pools',{poolName:`DEV Smoke ${name}`,poolAreaIds:[poolLookups.areas[0].id],companyIds:[poolLookups.companies[0].id],inputFrequencyId:poolLookups.inputFrequencies.find(f=>f.code==='MONTHLY').id,validFrom:start,validTo:end}));
  assert.equal(new Date(pool.createdAt).getUTCFullYear(),started.getUTCFullYear(),'Pool createdAt must be actual audit time');
  await api('pool',`/kpi-pools/${pool.id}/kpi-configurations`,{configurationIds:letters.map(l=>String(configs[l].id)),effectiveFromPeriod:start});
  const card=unwrap(await api('scorecard','/scorecards',{name:`DEV Smoke ${name}`,kpiPoolExternalId:String(pool.id),departments:[{externalDepartmentId:'2001',companyExternalId:poolLookups.companies[0].id,code:'ADMINISTRACI_N',name:'Administración'}],collaborators:[{externalEmployeeId:'100',departmentExternalId:'2001',code:'DEV-ADMIN',name:'Development Actor'}]}));
  return {pool,card};
}
async function materialize(context,key,letters) {
  const {pool,card}=context;
  // Waiting is only for the durable closure projection, never wall-clock eligibility.
  for(let attempt=0;;attempt++) {
    try{await api('pool',`/kpi-pools/${pool.id}/input-periods/finalize`,{periodStart:`${key}-01`});break;}
    catch(e){if(attempt>=20||!e.message.includes('PREVIOUS_INPUT_PERIOD_NOT_CLOSED'))throw e;await pause();}
  }
  const memberships=unwrap(await api('pool',`/kpi-pools/${pool.id}/kpi-configurations?periodStart=${key}-01`));
  await api('scorecard',`/scorecards/${card.id}/periods/${key}/kpis`,{items:memberships.map(m=>({poolMembershipExternalId:m.membershipId,weight:letters.length===1?100:25}))});
  if(letters.includes('D')) await api('scorecard',`/scorecards/${card.id}/periods/${key}/weights`,{kpis:letters.map(l=>({kpiConfigurationExternalId:String(configs[l].id),weight:l==='D'?0:25,...(l==='D'?{entityWeights:subjects.map(s=>({subjectExternalId:s.subjectExternalId,weight:12.5}))}:{})})),linkedScorecards:[]},'PATCH');
  await api('scorecard',`/scorecards/${card.id}/periods/${key}/finalize`,{});
  const periods=unwrap(await api('pool',`/kpi-pools/${pool.id}/input-periods`));
  const inputPeriod=periods.find(p=>p.periodKey===key);
  const projection=unwrap(await api('scorecard',`/scorecards/internal/monitoring-materialization?poolId=${pool.id}&poolInputPeriodId=${inputPeriod.poolPeriodId}`));
  for(const card of projection.scorecards)for(const assignment of card.directKpiAssignments){
    assert(assignment.kpiConfigurationRevisionId);assert(assignment.settingsProvenance);
    const f=assignment.effectiveSettings;assert.equal(f.contractVersion,'FrozenEffectiveKpiSettingsV1');assert.equal(f.executability.executable,true);
    for(const field of ['goalUnit','measurementUnit','evaluationType','scoringMethod','scoringRuleConfig','thresholds','periodScope'])assert(f[field]!=null,`Missing frozen ${field}`);
  }
  const period=unwrap(await api('monitoring','/monitoring-periods/materialize',{poolId:String(pool.id),poolInputPeriodId:inputPeriod.poolPeriodId}));
  assert.equal(period.periodKey,key);
  return period.id;
}
const entry=id=>api('monitoring',`/monitoring-periods/${id}/result-entry`);
async function saveAndCheck(id,historicalKey) {
  let row=await entry(id);
  await api('monitoring',`/monitoring-periods/${id}/result-entry/save-changes`,{resultsVersion:row.monitoringPeriod.resultsVersion,changes:row.inputs.map(i=>({monitoringPeriodInputId:i.id,resultValue:i.goal==='0'?'0':historicalKey?'110':'100',version:i.version}))});
  if(historicalKey) {
    row=await entry(id);
    for(const input of row.inputs) {
      const candidates=await api('monitoring',`/monitoring-periods/${id}/inputs/${input.id}/baseline-candidates`);
      assert.equal(candidates.requiredPeriod.key,historicalKey);
      const source=candidates.data.find(c=>c.periodKey===historicalKey&&c.kpiName==='DEV Smoke A');assert(source,'Expected historical baseline candidate');
      await api('monitoring',`/monitoring-periods/${id}/inputs/${input.id}/baseline-resolution`,{expectedBaselineVersion:row.monitoringPeriod.baselineVersion,sourceResultId:source.id},'PUT');
      row=await entry(id);
    }
  }
  row=await entry(id);
  const checked=await api('monitoring',`/monitoring-periods/${id}/check-results`,{expectedResultsVersion:row.monitoringPeriod.resultsVersion,expectedBaselineVersion:row.monitoringPeriod.baselineVersion});
  assert.equal(checked.check.summary.runStatus,'PASSED',JSON.stringify(checked));
  console.log(`Monitoring ${id}: ${checked.check.summary.scoring.calculated} calculated; baseline ${historicalKey??'not required'}`);
  return checked;
}
async function close(id){for(const action of ['submit','approve','close']){const row=await entry(id);await api('monitoring',`/monitoring-periods/${id}/${action}`,{version:row.monitoringPeriod.version});}assert.equal((await entry(id)).monitoringPeriod.status,'CLOSED');}
const janContext=await newPool('January-February 2023','2023-01-01','2023-02-28',['A']);
const jan=await materialize(janContext,'2023-01',['A']);await saveAndCheck(jan);await close(jan);
await api('pool',`/kpi-pools/${janContext.pool.id}/kpi-configurations/replace`,{oldConfigurationId:String(configs.A.id),newConfigurationId:String(configs.E.id),effectiveFromPeriod:'2023-02-01'});
const feb=await materialize(janContext,'2023-02',['E']);await saveAndCheck(feb,'2023-01');
const aug23Context=await newPool('August 2023','2023-08-01','2023-08-31',['A']);
const aug23=await materialize(aug23Context,'2023-08',['A']);await saveAndCheck(aug23);await close(aug23);
const aug24Context=await newPool('August 2024','2024-08-01','2024-08-31',['F']);
const aug24=await materialize(aug24Context,'2024-08',['F']);await saveAndCheck(aug24,'2023-08');
const modernContext=await newPool('September 2026','2026-09-01','2026-09-30',['A','B','C','D']);
const modern=await materialize(modernContext,'2026-09',['A','B','C','D']);await saveAndCheck(modern);
console.log(JSON.stringify({smoke:'PASSED',monitoringPeriods:{jan,feb,aug23,aug24,modern},auditStartedAt:started.toISOString()},null,2));
