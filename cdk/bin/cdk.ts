#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import {AwsSolutionsChecks} from 'cdk-nag';
import { Aspects } from 'aws-cdk-lib';

const app = new cdk.App();
const createFrontend = app.node.tryGetContext('createFrontend') === 'true';
const generateInitialUser = app.node.tryGetContext('generateInitialUser') === 'true';

new CdkStack(app, 'ServerlessRAG', {
    createFrontend,
    generateInitialUser,
});
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

