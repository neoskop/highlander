import * as deepmerge from "deepmerge";
import * as os from "os";
import { HighlanderConfig } from "../highlander-config.interface";
import { HighlanderData } from "../highlander-data.interface";

export abstract class Provider {
  public readonly name: string;
  public readonly instanceName: string;

  constructor(config?: HighlanderConfig) {
    const mergedConfig: Required<HighlanderConfig> = deepmerge(
      {
        name: null,
        namespace: "default",
        instanceName: os.hostname(),
        kubeconfig: null
      },
      config || {}
    );
    this.name = mergedConfig.name;
    this.instanceName = mergedConfig.instanceName;
  }

  protected getHighlanderData(): { [name: string]: string } {
    return {
      leaderName: this.instanceName,
      lastHeartbeat: Date.now().toString()
    };
  }

  abstract read():
    | HighlanderData
    | undefined
    | Promise<HighlanderData | undefined>;
  abstract create(): boolean | Promise<boolean>;
  abstract update(): boolean | Promise<boolean>;
}
