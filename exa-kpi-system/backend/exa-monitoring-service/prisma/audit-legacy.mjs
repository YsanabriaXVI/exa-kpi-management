import {PrismaClient} from '@prisma/client';
const p=new PrismaClient();
try {
const period=await p.monitoringPeriod.findUnique({where:{id:1n},include:{inputs:{include:{thresholds:true,result:true}},scorecards:true}});
console.log(JSON.stringify(period,(_,v)=>typeof v==='bigint'?String(v):v,2));
} finally {await p.$disconnect();}
