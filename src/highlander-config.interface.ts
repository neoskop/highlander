export interface HighlanderConfig {
  name: string; // the name of the election
  instanceName?: string; // the name of a single instance - if null the hostname is used
  heartbeatValidity?: number; // The time in milliseconds for which a heartbeat is valid
  checkInterval?: number; // The time in milliseconds in which instances will check or update (in ase of the leader) the heartbeat
}
