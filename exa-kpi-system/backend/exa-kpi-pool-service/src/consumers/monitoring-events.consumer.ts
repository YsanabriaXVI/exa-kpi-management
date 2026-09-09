import { Prisma } from "@prisma/client";
import{consumerOpts,createInbox,JSONCodec,type JetStreamSubscription}from"nats";import{z}from"zod";import{env}from"../config/env.js";import{logger}from"../config/logger.js";import{natsManager}from"../config/nats.js";import{prisma}from"../config/prisma.js";
const envelope=z.object({eventId:z.string().uuid(),eventType:z.literal("monitoring.period.closed.v1"),occurredAt:z.string().datetime(),producer:z.literal("exa-monitoring-service"),aggregateId:z.string().regex(/^\d+$/),version:z.number().int().positive(),data:z.object({monitoringPeriodId:z.string().regex(/^\d+$/),kpiPoolId:z.string().regex(/^\d+$/),poolInputPeriodId:z.string().regex(/^\d+$/),periodKey:z.string(),closedAt:z.string().datetime(),closedWithExceptions:z.boolean()}).passthrough()});const json=JSONCodec<unknown>();
export async function processMonitoringClosedEvent(raw:unknown,subject:string) {
  const event=envelope.parse(raw);
  for(let attempt=0;attempt<3;attempt++) {
    try { return await prisma.$transaction(async tx=>{
      const processed=await tx.processedEvent.findUnique({where:{eventId:event.eventId}});
      const key={kpiPoolId:BigInt(event.data.kpiPoolId),poolInputPeriodExternalId:BigInt(event.data.poolInputPeriodId)};
      const existing=await tx.monitoringPeriodClosureReference.findUnique({where:{kpiPoolId_poolInputPeriodExternalId:key}});
      if(existing && (existing.monitoringPeriodExternalId!==BigInt(event.data.monitoringPeriodId) || existing.periodKey!==event.data.periodKey))
        throw new Error("Monitoring closure identity conflicts with the existing projection");
      if(processed && existing && existing.sourceVersion>=event.version)return "duplicate" as const;
      const data={closureType:event.data.closedWithExceptions?"WITH_EXCEPTIONS":"NORMAL",closedAt:new Date(event.data.closedAt),sourceVersion:event.version,sourceEventId:event.eventId};
      if(!existing) await tx.monitoringPeriodClosureReference.create({data:{...key,...data,monitoringPeriodExternalId:BigInt(event.data.monitoringPeriodId),periodKey:event.data.periodKey}});
      else if(existing.sourceVersion<event.version) await tx.monitoringPeriodClosureReference.updateMany({where:{id:existing.id,sourceVersion:{lt:event.version}},data});
      if(!processed)await tx.processedEvent.create({data:{eventId:event.eventId,eventType:event.eventType,subject,aggregateId:event.aggregateId,sourceService:event.producer}});
      return existing && existing.sourceVersion>=event.version ? "ignored_stale" as const : "processed" as const;
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable}); }
    catch(error) { if(attempt===2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || !["P2002","P2034"].includes(error.code))throw error; }
  }
  throw new Error("Closure projection retry exhausted");
}
class MonitoringEventsConsumer {
  private subscription?:JetStreamSubscription;
  private client?: import("nats").JetStreamClient;
  private timer?:NodeJS.Timeout;
  private stopped=true;
  private starting=false;
  async start(){if(!env.NATS_ENABLED||!this.stopped)return;this.stopped=false;await this.ensure();}
  private async ensure(){
    if(this.stopped||this.starting)return;
    this.starting=true;
    try {
      const js=natsManager.jetStream;
      if(this.subscription && (this.client!==js || this.subscription.isClosed())){await this.subscription.unsubscribe();this.subscription=undefined;}
      if(js&&!this.subscription){
        const options=consumerOpts();options.durable(env.NATS_MONITORING_CONSUMER);options.deliverTo(createInbox());
        options.manualAck();options.ackExplicit();options.deliverAll();options.maxDeliver(10);options.bindStream(env.NATS_MONITORING_STREAM);
        const subscription=await js.subscribe("monitoring.period.closed.v1",options);
        if(this.stopped){subscription.unsubscribe();return;}
        this.client=js;this.subscription=subscription;void this.consume(subscription);
      }
    } catch(error){logger.warn({error},"Monitoring closure subscription unavailable; retrying");}
    finally{this.starting=false;if(!this.stopped){this.timer=setTimeout(()=>void this.ensure(),5000);this.timer.unref();}}
  }
  private async consume(subscription:JetStreamSubscription){
    try {for await(const message of subscription){
      try {await processMonitoringClosedEvent(json.decode(message.data),message.subject);message.ack();}
      catch(error){
        logger.error({error,streamSequence:message.info.streamSequence,deliveryCount:message.info.deliveryCount,deliveriesExhausted:message.info.deliveryCount>=10,eventSubject:message.subject},"Monitoring closure delivery failed; use ops:closures for inspection/replay");
        if(error instanceof z.ZodError)message.term();else message.nak(5000);
      }
    }} catch(error){logger.error({error},"Monitoring closure consumer interrupted; subscription will recover");}
    finally{subscription.unsubscribe();if(this.subscription===subscription)this.subscription=undefined;}
  }
  async stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.subscription?.unsubscribe();this.subscription=undefined;}
}
export const monitoringEventsConsumer=new MonitoringEventsConsumer();
