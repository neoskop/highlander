import { Highlander } from "./highlander";
import { HighlanderConfig } from "./highlander-config.interface";
import { HighlanderData } from "./highlander-data.interface";
import { Provider } from "./providers/provider";

class MockProvider extends Provider {
  private readCount: number = 0;

  constructor(config: HighlanderConfig) {
    super(config);
  }

  read(): HighlanderData | undefined {
    const result =
      this.readCount > 0
        ? {
            leaderName: "foo",
            lastHeartbeat: "bar"
          }
        : undefined;
    this.readCount++;
    return result;
  }

  create() {
    return true;
  }

  update() {
    return true;
  }
}

test("A provider instance is created upon creation of the highlander instance", () => {
  const sut = new Highlander(MockProvider, { name: "foo" });
  expect(sut.provider).toBeInstanceOf(MockProvider);
});

test("The provider is asked to read and create the config upon starting a single instance", async () => {
  const sut = new Highlander(MockProvider, { name: "bar" });
  jest.spyOn(sut.provider, "read");
  jest.spyOn(sut.provider, "create");
  await sut.start();
  expect(sut.provider.read).toHaveBeenCalled();
  expect(sut.provider.create).toHaveBeenCalled();
  sut.stop();
});
