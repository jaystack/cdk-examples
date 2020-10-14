#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RestApiStack } from '../lib/rest-api-stack';

const app = new cdk.App();
new RestApiStack(app, 'RestApiStack');
