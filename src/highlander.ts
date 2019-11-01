import chalk from "chalk";
import * as deepmerge from "deepmerge";
import * as os from "os";
import { HighlanderConfig } from "./highlander-config.interface";
import { HighlanderData } from "./highlander-data.interface";
import { logger } from "./logger";
import { Provider } from "./providers/provider";

export class Highlander<
  T extends Provider,
  O extends new (config?: HighlanderConfig) => T,
  C extends ConstructorParameters<O>[0]
> {
  public readonly provider: Provider;
  private timer: NodeJS.Timer;
  private data: HighlanderData | undefined;
  public readonly name: string;
  public readonly instanceName: string;
  public readonly heartbeatValidity: number;
  public readonly checkInterval: number;

  public constructor(provider: O, config?: C) {
    const mergedConfig: Required<HighlanderConfig> = deepmerge(
      {
        name: "",
        namespace: "default",
        instanceName: os.hostname(),
        heartbeatValidity: 5000,
        checkInterval: 2500
      },
      (config as HighlanderConfig) || {}
    );
    this.name = mergedConfig.name;
    this.instanceName = mergedConfig.instanceName;
    this.heartbeatValidity = mergedConfig.heartbeatValidity;
    this.checkInterval = mergedConfig.checkInterval;
    this.provider = new provider(mergedConfig);
  }

  public async start() {
    await this.checkStatus();
    this.timer = setInterval(this.checkStatus.bind(this), this.checkInterval);
  }

  public stop() {
    clearInterval(this.timer);
  }

  public isLeader(): boolean {
    return this.data ? this.data.leaderName === this.instanceName : false;
  }

  public async checkStatus() {
    logger.debug(`Checking status for ${chalk.bold(this.instanceName)}`);
    const data = await this.provider.read();

    if (!data) {
      logger.debug(
        `Trying to create a record with ${chalk.bold(
          this.instanceName
        )} as a leader.`
      );
      await this.provider.create();
      this.data = await this.provider.read();
    } else {
      this.data = data;
      const date = Number(data.lastHeartbeat);

      if (
        isNaN(date) ||
        Date.now() - date > this.heartbeatValidity ||
        this.isLeader()
      ) {
        await this.provider.update();
        this.data = await this.provider.read();
      }
    }
  }

  public toString() {
    return this.instanceName;
  }
}
