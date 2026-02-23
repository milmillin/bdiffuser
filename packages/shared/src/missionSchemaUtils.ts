import type { WirePoolSpec } from "./missionSchemaTypes.js";

export function getWirePoolCount(spec: WirePoolSpec): number {
  switch (spec.kind) {
    case "none":
      return 0;
    case "exact":
      return spec.count;
    case "out_of":
      return spec.keep;
    case "fixed":
      return spec.values.length;
  }
}

export function describeWirePoolSpec(spec: WirePoolSpec): string {
  switch (spec.kind) {
    case "none":
      return "0";
    case "exact":
      return `${spec.count}`;
    case "out_of":
      return `${spec.keep} out of ${spec.draw}`;
    case "fixed":
      return `fixed ${spec.values.length}`;
  }
}
