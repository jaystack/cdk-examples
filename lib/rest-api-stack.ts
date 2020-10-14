import * as cdk from '@aws-cdk/core';
import { Cors, LambdaIntegration, RestApi } from '@aws-cdk/aws-apigateway';
import { Runtime } from '@aws-cdk/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from '@aws-cdk/aws-lambda-nodejs';
import { join } from 'path';
import { ServerlessDatabase } from './constructs/db';
import { Network } from './constructs/network';

export class RestApiStack extends cdk.Stack {
  network: Network;
  db: ServerlessDatabase;
  api: RestApi;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.network = new Network(this, 'Network', {});

    this.db = new ServerlessDatabase(this, 'SlsDb', {
      securityGroupIds: [this.network.allowPublicAccessSecurityGroup.securityGroupId],
      subnetIds: this.network.databaseSubnets.subnetIds,
    });

    this.api = new RestApi(this, 'RestApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const sharedHandlerProps: Partial<NodejsFunctionProps> = {
      runtime: Runtime.NODEJS_12_X,
      environment: {
        DEBUG: '*',
        POSTGRES_CONFIG: JSON.stringify(this.db.dbSecretPayload),
      },
    };

    const usersResource = this.api.root.addResource('users');
    const userResource = usersResource.addResource('{id}');

    usersResource.addMethod(
      'POST',
      new LambdaIntegration(
        new NodejsFunction(this, 'CreateUserHandler', {
          ...sharedHandlerProps,
          entry: join(__dirname, './handlers/CreateUserHandler.ts'),
        })
      )
    );
    userResource.addMethod(
      'GET',
      new LambdaIntegration(
        new NodejsFunction(this, 'GetUserHandler', {
          ...sharedHandlerProps,
          entry: join(__dirname, './handlers/GetUserHandler.ts'),
        })
      )
    );
    userResource.addMethod(
      'PUT',
      new LambdaIntegration(
        new NodejsFunction(this, 'UpdateUserHandler', {
          ...sharedHandlerProps,
          entry: join(__dirname, './handlers/UpdateUserHandler.ts'),
        })
      )
    );
    userResource.addMethod(
      'DELETE',
      new LambdaIntegration(
        new NodejsFunction(this, 'DeleteUserHandler', {
          ...sharedHandlerProps,
          entry: join(__dirname, './handlers/DeleteUserHandler.ts'),
        })
      )
    );
  }
}
