import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

interface ApiUserStackProps extends cdk.StackProps {
  projectName: string;
  userPool: cognito.UserPool;
  tables: {
    users: dynamodb.Table;
    channels: dynamodb.Table;
    videos: dynamodb.Table;
    subscriptions: dynamodb.Table;
  };
  cloudFrontDistribution: cloudfront.IDistribution;
}

export class ApiUserStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiUserStackProps) {
    super(scope, id, props);

    const { projectName, userPool, tables, cloudFrontDistribution } = props;

    const commonEnv = {
      USERS_TABLE: tables.users.tableName,
      CHANNELS_TABLE: tables.channels.tableName,
      VIDEOS_TABLE: tables.videos.tableName,
      SUBSCRIPTIONS_TABLE: tables.subscriptions.tableName,
      CLOUDFRONT_DOMAIN: cloudFrontDistribution.distributionDomainName,
    };

    const getChannelsHandler = new lambda.Function(this, 'GetChannelsHandler', {
      functionName: `${projectName}-get-channels`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    const getChannelHandler = new lambda.Function(this, 'GetChannelHandler', {
      functionName: `${projectName}-get-channel`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    const getVideoHandler = new lambda.Function(this, 'GetVideoHandler', {
      functionName: `${projectName}-get-video`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    const getSubscriptionsHandler = new lambda.Function(this, 'GetSubscriptionsHandler', {
      functionName: `${projectName}-get-subscriptions`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200, body: "Not implemented" })'),
      environment: commonEnv,
    });

    tables.channels.grantReadData(getChannelsHandler);
    tables.channels.grantReadData(getChannelHandler);
    tables.videos.grantReadData(getChannelHandler);
    tables.videos.grantReadData(getVideoHandler);
    tables.subscriptions.grantReadData(getVideoHandler);
    tables.subscriptions.grantReadData(getSubscriptionsHandler);

    const api = new apigateway.RestApi(this, 'UserApi', {
      restApiName: `${projectName}-user-api`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const channels = api.root.addResource('channels');
    channels.addMethod('GET', new apigateway.LambdaIntegration(getChannelsHandler));

    const channel = channels.addResource('{id}');
    channel.addMethod('GET', new apigateway.LambdaIntegration(getChannelHandler));

    const videos = api.root.addResource('videos');
    const video = videos.addResource('{id}');
    video.addMethod('GET', new apigateway.LambdaIntegration(getVideoHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const me = api.root.addResource('me');
    const subscriptions = me.addResource('subscriptions');
    subscriptions.addMethod('GET', new apigateway.LambdaIntegration(getSubscriptionsHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    new cdk.CfnOutput(this, 'UserApiUrl', {
      value: api.url,
      exportName: `${projectName}-user-api-url`,
    });
  }
}
