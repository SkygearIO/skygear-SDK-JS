export function parseSemver(
  version: string
):
  | {
      major: number;
      minor: number;
      patch: number;
    }
  | undefined {
  const regex = /^(\d+)\.(\d+)\.?(\d+)?$/i;
  const result = regex.exec(version);
  if (result) {
    return {
      major: parseInt(result[1], 10),
      minor: parseInt(result[2], 10),
      patch: result[3] ? parseInt(result[3], 10) : 0,
    };
  }
  return undefined;
}
