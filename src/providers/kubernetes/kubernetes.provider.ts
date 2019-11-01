import * as k8s from "@kubernetes/client-node";
import { CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import chalk from "chalk";
import * as deepmerge from "deepmerge";
import { HighlanderData } from "../../highlander-data.interface";
import { logger } from "../../logger";
import { Provider } from "../provider";
import { KubernetesProviderConfig } from "./kubernetes-provider-config.interface";

export class KubernetesProvider extends Provider {
  private readonly configMapName: string;
  private readonly namespace: string;
  private k8sApi: k8s.CoreV1Api;
  private resourceVersion: string | undefined;

  constructor(config?: KubernetesProviderConfig) {
    super(config);
    const mergedConfig: Required<KubernetesProviderConfig> = deepmerge(
      {
        namespace: "default",
        kubeconfig: null
      },
      config || {}
    );
    this.namespace = mergedConfig.namespace;
    this.configMapName =
      mergedConfig.name === null
        ? "highlander"
        : `${mergedConfig.name}-highlander`;
    const kc = new KubeConfig();
    kc.loadFromDefault();
    this.k8sApi = kc.makeApiClient(CoreV1Api);
  }

  async read(): Promise<HighlanderData | undefined> {
    try {
      const response = (await this.k8sApi.readNamespacedConfigMap(
        this.configMapName,
        this.namespace
      )).body;
      const configMapData = response.data;
      if (configMapData) {
        this.resourceVersion = response.metadata!.resourceVersion;
        return {
          leaderName: configMapData.leaderName,
          lastHeartbeat: configMapData.lastHeartbeat
        };
      }
    } catch (err) {
      if (err.response.statusCode !== 404) {
        logger.error(
          `Reading of config map ${chalk.bold(
            this.configMapName
          )} in namespace ${chalk.bold(this.namespace)} failed!`,
          err
        );
      }
    }

    return undefined;
  }

  async create(): Promise<boolean> {
    logger.debug(
      `ConfigMap ${chalk.bold(this.configMapName)} in namespace ${chalk.bold(
        this.namespace
      )} does not exist yet - creating it!`
    );
    try {
      await this.k8sApi.createNamespacedConfigMap(this.namespace, {
        metadata: { name: this.configMapName },
        data: this.getHighlanderData()
      });
      return true;
    } catch (err) {
      if (err.response.statusCode === 409) {
        logger.debug(
          `ConfigMap ${chalk.bold(
            this.configMapName
          )} in namespace ${chalk.bold(this.namespace)} already exists`
        );
      } else {
        logger.error(
          `Creation of config map ${chalk.bold(
            this.configMapName
          )} in namespace ${chalk.bold(this.namespace)} failed!`,
          err
        );
      }
      return false;
    }
  }

  async update(): Promise<boolean> {
    try {
      await this.k8sApi.patchNamespacedConfigMap(
        this.configMapName,
        this.namespace,
        {
          metadata: {
            name: this.configMapName,
            resourceVersion: this.resourceVersion
          },
          data: this.getHighlanderData()
        },
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            "Content-Type": "application/merge-patch+json"
          }
        }
      );
      return true;
    } catch (err) {
      if (err.response.statusCode === 409) {
        logger.debug(
          `ConfigMap ${chalk.bold(this.configMapName)} was already updated`
        );
      } else {
        logger.error(
          `Updating of config map ${chalk.bold(
            this.configMapName
          )} in namespace ${chalk.bold(this.namespace)} failed!`,
          err
        );
      }
      return false;
    }
  }
}
