import { AppError, ErrorCodes } from "@jaystack/sls-core";
import { DbSecretPayload } from "../constructs/db";
import { EnvVarNames } from "../shared";

export let pgConfig: DbSecretPayload;

try {
  const { [EnvVarNames.pgConfig]: pgConfigStr } = process.env;
  console.log(JSON.stringify(pgConfigStr, null, 2));
  pgConfig = JSON.parse(pgConfigStr!);
} catch (error) {
  throw new AppError(ErrorCodes.CONFIGURATION, "Missing or invalid Postgres Config!", error);
}
