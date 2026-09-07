import {PrismaClient} from '@prisma/client';
const p=new PrismaClient();
try {
const rows=await p.kpiConfigurationRevision.findMany({where:{id:{in:[2n,52n,3n,4n,5n,6n,7n,8n,9n,10n]}},include:{evaluationType:true,measurementUnit:true,thresholds:true}});
console.log(JSON.stringify(rows,(_,v)=>typeof v==='bigint'?String(v):v,2));
}finally{await p.$disconnect();}
