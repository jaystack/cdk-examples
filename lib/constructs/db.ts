import { Construct } from "@aws-cdk/core";
import { CfnDBCluster, CfnDBSubnetGroup } from "@aws-cdk/aws-rds";
import { CfnSecret, Secret } from "@aws-cdk/aws-secretsmanager";

export interface DbSecretPayload {
  username: string;
  password: string;
  port: string;
  host: string;
  database: string;
}

export interface ServerlessDatabaseProps {
  subnetIds: string[];
  securityGroupIds: string[];
  username?: string;
  databaseName?: string;
  secretKey?: string;
  secondsUntilAutoPause?: number;
  minCapacity?: number;
  maxCapacity?: number;
}

export class ServerlessDatabase extends Construct {
  dbSubnetGroup: CfnDBSubnetGroup;
  cfnCluster: CfnDBCluster;
  dbSecret: CfnSecret;
  dbSecretPayload: DbSecretPayload;

  generatedSecret: Secret;

  constructor(scope: Construct, id: string, props: ServerlessDatabaseProps) {
    super(scope, id);

    const {
      securityGroupIds,
      subnetIds,
      databaseName,
      secretKey,
      username = "postgres",
    } = props;

    this.dbSubnetGroup = new CfnDBSubnetGroup(this, `${id}-DbSubnetGroup`, {
      dbSubnetGroupDescription: "db private subnet group",
      subnetIds,
    });

    this.generatedSecret = new Secret(this, `${id}-GeneratedSecret`, {
      generateSecretString: {
        generateStringKey: "password",
        passwordLength: 42,
        secretStringTemplate: "{}",
        excludePunctuation: true,
        requireEachIncludedType: true,
      },
    });

    const password = this.generatedSecret.secretValueFromJson("password").toString();

    this.cfnCluster = new CfnDBCluster(this, `${id}-ServerlessPostgresCluster`, {
      engine: "aurora-postgresql",
      engineVersion: "10.7",
      engineMode: "serverless",
      dbSubnetGroupName: this.dbSubnetGroup.ref,
      vpcSecurityGroupIds: securityGroupIds,
      masterUsername: username,
      masterUserPassword: password,
      databaseName,
      scalingConfiguration: {
        minCapacity: props.minCapacity ?? 2,
        maxCapacity: props.maxCapacity ?? props.minCapacity ?? 2,
        autoPause: Number.isInteger(props.secondsUntilAutoPause) ? true : false,
        secondsUntilAutoPause: props.secondsUntilAutoPause,
      },
    });

    this.dbSecretPayload = {
      password,
      username,
      port: this.cfnCluster.attrEndpointPort,
      host: this.cfnCluster.attrEndpointAddress,
      database: this.cfnCluster.databaseName!,
    };

    this.dbSecret = new CfnSecret(this, `${id}-RdsCredentials`, {
      name: secretKey,
      secretString: JSON.stringify(this.dbSecretPayload),
    });
  }
}
