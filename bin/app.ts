#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DynamoStack } from '../lib/dynamo-stack';
import { AuthStack } from '../lib/auth-stack';
import { CloudFrontStack } from '../lib/cloudfront-stack';
import { MediaConvertStack } from '../lib/mediaconvert-stack';
import { ApiUserStack } from '../lib/api-user-stack';
import { ApiStreamerStack } from '../lib/api-streamer-stack';

const app = new cdk.App();

const projectName = 'subscription-streaming';
const region = 'ap-northeast-1';

// S3 バケット名（AWS CLI で事前に作成する必要があります）
const uploadBucketName = `${projectName}-vod-raw-uploads`;
const transcodedBucketName = `${projectName}-vod-transcoded`;

// DynamoDB
const dynamoStack = new DynamoStack(app, 'DynamoStack', {
  projectName,
  env: { region },
});

// Cognito
const authStack = new AuthStack(app, 'AuthStack', {
  projectName,
  env: { region },
});

// CloudFront
const cloudFrontStack = new CloudFrontStack(app, 'CloudFrontStack', {
  projectName,
  transcodedBucketName,
  env: { region },
});

// MediaConvert
const mediaConvertStack = new MediaConvertStack(app, 'MediaConvertStack', {
  projectName,
  uploadBucketName,
  transcodedBucketName,
  env: { region },
});

// User API
const apiUserStack = new ApiUserStack(app, 'ApiUserStack', {
  projectName,
  userPool: authStack.userPool,
  tables: dynamoStack.tables,
  cloudFrontDistribution: cloudFrontStack.distribution,
  env: { region },
});

// Streamer API
const apiStreamerStack = new ApiStreamerStack(app, 'ApiStreamerStack', {
  projectName,
  userPool: authStack.userPool,
  tables: dynamoStack.tables,
  uploadBucketName,
  env: { region },
});
