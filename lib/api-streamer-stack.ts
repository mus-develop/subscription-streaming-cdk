import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface ApiStreamerStackProps extends cdk.StackProps {
  projectName: string;
  userPool: cognito.UserPool;
  tables: {
    users: dynamodb.Table;
    channels: dynamodb.Table;
    videos: dynamodb.Table;
    subscriptions: dynamodb.Table;
  };
  uploadBucketName: string;
}

export class ApiStreamerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStreamerStackProps) {
    super(scope, id, props);

    const { projectName, userPool, tables, uploadBucketName } = props;

    const uploadBucket = s3.Bucket.fromBucketName(
      this,
      'UploadBucket',
      uploadBucketName
    );

    const commonEnv = {
      USERS_TABLE: tables.users.tableName,
      CHANNELS_TABLE: tables.channels.tableName,
      VIDEOS_TABLE: tables.videos.tableName,
      SUBSCRIPTIONS_TABLE: tables.subscriptions.tableName,
      UPLOAD_BUCKET: uploadBucketName,
    };

    const createChannelHandler = new lambda.Function(this, 'CreateChannelHandler', {
      functionName: `${projectName}-create-channel`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    const uploadUrlHandler = new lambda.Function(this, 'UploadUrlHandler', {
      functionName: `${projectName}-upload-url`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    const getCreatorVideosHandler = new lambda.Function(this, 'GetCreatorVideosHandler', {
      functionName: `${projectName}-get-creator-videos`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    const publishVideoHandler = new lambda.Function(this, 'PublishVideoHandler', {
      functionName: `${projectName}-publish-video`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    tables.channels.grantWriteData(createChannelHandler);
    tables.videos.grantWriteData(uploadUrlHandler);
    tables.videos.grantReadData(getCreatorVideosHandler);
    tables.videos.grantReadWriteData(publishVideoHandler);

    uploadUrlHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject', 's3:GetObject'],
        resources: [`arn:aws:s3:::${uploadBucketName}/*`],
      })
    );

    const api = new apigateway.RestApi(this, 'StreamerApi', {
      restApiName: `${projectName}-streamer-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const channels = api.root.addResource('channels');
    channels.addMethod('POST', new apigateway.LambdaIntegration(createChannelHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const videos = api.root.addResource('videos');
    const uploadUrl = videos.addResource('upload-url');
    uploadUrl.addMethod('POST', new apigateway.LambdaIntegration(uploadUrlHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const creator = api.root.addResource('creator');
    const creatorVideos = creator.addResource('videos');
    creatorVideos.addMethod('GET', new apigateway.LambdaIntegration(getCreatorVideosHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const creatorVideo = creatorVideos.addResource('{id}');
    const publish = creatorVideo.addResource('publish');
    publish.addMethod('POST', new apigateway.LambdaIntegration(publishVideoHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    new cdk.CfnOutput(this, 'StreamerApiUrl', {
      value: api.url,
      exportName: `${projectName}-streamer-api-url`,
    });
  }
}
