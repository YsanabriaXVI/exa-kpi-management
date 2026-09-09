import { connect, StorageType, type JetStreamClient, type NatsConnection } from "nats";
import { env } from "./env.js";
import { logger } from "./logger.js";
export type NatsConnectionState = "disabled" | "connecting" | "connected" | "degraded" | "closed";
class NatsManager {
  private connection?:NatsConnection;
  private client?:JetStreamClient;
  private state:NatsConnectionState=env.NATS_ENABLED?"closed":"disabled";
  private lastError?:string;
  private stopped=true;
  private timer?:NodeJS.Timeout;
  private pending?:Promise<void>;
  get status(){return {state:this.state,...(this.lastError?{lastError:this.lastError}:{})};}
  get jetStream(){return this.client;}
  async start(){
    if(!env.NATS_ENABLED)return;
    this.stopped=false;
    if(!this.pending)this.pending=this.ensure().finally(()=>{this.pending=undefined;});
    await this.pending;
  }
  private async ensure(){
    let candidate:NatsConnection|undefined;
    try {
      if(this.stopped||this.connection&&!this.connection.isClosed())return;
      this.state="connecting";
      candidate=await connect({servers:env.NATS_URL,name:env.NATS_NAME,reconnect:true,maxReconnectAttempts:-1,timeout:5000});
      const manager=await candidate.jetstreamManager();
      try{await manager.streams.info(env.NATS_STREAM);}catch(error){
        if((error as {code?:string}).code!=="404")throw error;
        await manager.streams.add({name:env.NATS_STREAM,subjects:[env.NATS_SUBJECTS],storage:StorageType.File});
      }
      if(this.stopped){await candidate.close();return;}
      const active=candidate;this.connection=active;this.client=active.jetstream();this.state="connected";this.lastError=undefined;
      void active.closed().then(error=>{
        if(this.connection!==active)return;
        this.connection=undefined;this.client=undefined;
        if(!this.stopped){this.state="degraded";this.lastError=error?.message??"NATS connection closed";}
      });
    }catch(error){
      if(candidate)await candidate.close().catch(()=>{});
      this.state=this.stopped?"closed":"degraded";this.lastError=error instanceof Error?error.message:String(error);
      logger.warn({error},"NATS unavailable; automatic startup recovery will retry");
    }finally{
      if(!this.stopped){if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>void this.start(),5000);this.timer.unref();}
    }
  }
  async stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);await this.pending;const active=this.connection;this.connection=undefined;this.client=undefined;this.state=env.NATS_ENABLED?"closed":"disabled";if(active&&!active.isClosed())await active.drain();}
}
export const natsManager=new NatsManager();
