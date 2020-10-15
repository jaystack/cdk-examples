#!/usr/bin/env node
import "source-map-support/register";
import { exec as execCb } from "child_process";
import { EnvVarNames } from "../lib/shared";
import { DbSecretPayload } from "../lib/constructs/db";
import { promisify } from "util";
import { promises as fs } from "fs";

const exec = promisify(execCb);

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

async function run({
  containerName = "cdk-example-pg",
  password = "test",
  username = "test",
  database = "cdk-example-local",
} = {}) {
  try {
    const { stderr, stdout } = await exec(
      `
docker run -d --name ${containerName} \\
  -e POSTGRES_PASSWORD=${password} \\
  -e POSTGRES_USER=${username} \\
  -e POSTGRES_DB=${database} \\
  -p 5432:5432 \\
postgres
`
    );
  } catch (error) {
    if (!/is already in use by container/g.test(error.stderr)) throw error;
    const { stderr, stdout } = await exec(`docker start ${containerName}`);
  }

  const config = {
    Parameters: {
      DEBUG: "*,-sequelize:*",
      [EnvVarNames.pgConfig]: JSON.stringify({
        host: containerName,
        port: "5432",
        database,
        password,
        username,
      } as DbSecretPayload),
    },
  };

  await fs.writeFile("temp.env.json", JSON.stringify(config, null, 2));
}
