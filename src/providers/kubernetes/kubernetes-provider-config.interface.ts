import { HighlanderConfig } from "../../highlander-config.interface";

export interface KubernetesProviderConfig extends HighlanderConfig {
  namespace?: string; // the namespace in which to create ressources
  kubeconfig?: string; // if set, the file is used as the context, otherwise it is assumed, that the app itself is running in a kubernetes cluster
}
