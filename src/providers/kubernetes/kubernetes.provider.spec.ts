import * as shelljs from "shelljs";
import { Highlander } from "../../highlander";
import { KubernetesProviderConfig } from "./kubernetes-provider-config.interface";
import { KubernetesProvider } from "./kubernetes.provider";

const createHighlander = (
  name: string,
  instanceName: string,
  checkInterval: number = 1000 * 60 * 60 * 24
): Highlander<
  KubernetesProvider,
  typeof KubernetesProvider,
  KubernetesProviderConfig
> => {
  return new Highlander(KubernetesProvider, {
    name,
    instanceName,
    checkInterval
  });
};

const createMultipleHighlanders = async (
  name: string,
  count: number
): Promise<
  Array<
    Highlander<
      KubernetesProvider,
      typeof KubernetesProvider,
      KubernetesProviderConfig
    >
  >
> => {
  const instances = Array.from({ length: count }, (v, i) =>
    createHighlander(name, `${name}-${i}`)
  );
  await Promise.all(instances.map(instance => instance.start()));
  return instances;
};

beforeAll(() => {
  if (shelljs.which("minikube") === null) {
    console.error("Install Minikube to run the tests!");
    shelljs.exit(1);
  }

  if (shelljs.exec("minikube status", { silent: true }).code !== 0) {
    console.log("Starting Minikube");
    shelljs.exec("minikube start", { silent: true });
  }
});

test("a single highlander instance is the leader", async () => {
  const sut = createHighlander("foo", "foo");
  await sut.start();
  expect(sut.isLeader()).toBeTruthy();
  sut.stop();
});

test("the leader updates the hearbeat automatically", async done => {
  const sut = createHighlander("foobar", "foo", 50);
  const getHeartbeat = (name: string) => {
    return Number(
      shelljs.exec(
        `kubectl get cm ${name}-highlander -ojsonpath='{.data.lastHeartbeat}'`,
        { silent: true }
      ).stdout
    );
  };
  await sut.start();
  expect(sut.isLeader()).toBeTruthy();
  const firstHeartbeat = getHeartbeat("foobar");
  setTimeout(() => {
    const secondHeartbeat = getHeartbeat("foobar");
    expect(firstHeartbeat).toBeLessThan(secondHeartbeat);
    sut.stop();
    done();
  }, 200);
});

test("there may only be one leader amongst multiple highlanders", async () => {
  const instances = await createMultipleHighlanders("bar", 3);
  expect(instances.filter(instance => instance.isLeader()).length).toEqual(1);
  instances.forEach(instance => instance.stop());
});

test("a leader changes when the fist one stops existing", async () => {
  const instances = await createMultipleHighlanders("baz", 3);
  const firstLeader = instances.filter(instance => instance.isLeader())[0];
  expect(firstLeader).toBeDefined();
  firstLeader.stop();
  delete instances[instances.findIndex(instance => instance === firstLeader)];
  shelljs.exec(
    `kubectl patch cm baz-highlander -p '{"data":{"lastHeartbeat":"0"}}'`
  );
  await Promise.all(instances.map(instance => instance.checkStatus()));
  const successor = instances.filter(instance => instance.isLeader())[0];
  expect(successor).toBeDefined();
  expect(firstLeader).not.toEqual(successor);
  instances.forEach(instance => instance.stop());
});
