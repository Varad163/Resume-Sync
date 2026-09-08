/**
 * The IronBastion platform on AWS.
 *
 * Shape: an ALB in front of a Fargate API service, a second Fargate service
 * draining an SQS queue of scans, Aurora Serverless v2 in isolated subnets, and
 * a CloudFront-fronted bucket for the console. Nothing that holds customer data
 * is reachable from the internet.
 *
 * Two things are deliberate and worth reading:
 *
 * - The task role calls Claude through Claude Platform on AWS with SigV4, so
 *   there is no API key anywhere in this stack. The grant is scoped to the one
 *   workspace ARN and to the five actions inference actually needs.
 * - Worker scaling tracks queue depth rather than CPU, because a scan is IO- and
 *   model-bound; CPU-based scaling would sit idle while a backlog built up.
 */

import {
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
  CfnOutput,
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_ecs_patterns as ecsPatterns,
  aws_rds as rds,
  aws_s3 as s3,
  aws_sqs as sqs,
  aws_kms as kms,
  aws_iam as iam,
  aws_cognito as cognito,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_s3_deployment as s3deploy,
  aws_logs as logs,
  aws_applicationautoscaling as appscaling,
} from "aws-cdk-lib";
import type { Construct } from "constructs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export interface PlatformStackProps extends StackProps {
  /** Claude Platform on AWS workspace, e.g. `wrkspc_01AbCdEf`. */
  readonly anthropicWorkspaceId: string;
  /** Set false only for a throwaway environment. */
  readonly retainData?: boolean;
  /** Built console assets. Omit to skip the console deployment. */
  readonly consoleDist?: string;
}

export class PlatformStack extends Stack {
  constructor(scope: Construct, id: string, props: PlatformStackProps) {
    super(scope, id, props);

    const retain = props.retainData !== false;
    const removalPolicy = retain ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;

    // ------------------------------------------------------------- network
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        { name: "data", subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // ------------------------------------------------------------- storage
    const key = new kms.Key(this, "DataKey", {
      enableKeyRotation: true,
      description: "IronBastion customer evidence and database encryption",
      removalPolicy,
    });

    const certifyKey = new kms.Key(this, "CertifyKey", {
      keySpec: kms.KeySpec.RSA_2048,
      keyUsage: kms.KeyUsage.SIGN_VERIFY,
      description: "IronBastion PQC Certificate RSA Asymmetric Signing Key",
      removalPolicy,
    });

    const artefacts = new s3.Bucket(this, "Artefacts", {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy,
      lifecycleRules: [
        // Evidence is retained for the assurance window, then expires by itself.
        { id: "expire-evidence", expiration: Duration.days(400) },
        { id: "abort-multipart", abortIncompleteMultipartUploadAfter: Duration.days(7) },
      ],
    });

    // --------------------------------------------------------------- queue
    const deadLetterQueue = new sqs.Queue(this, "ScanDlq", {
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: key,
      retentionPeriod: Duration.days(14),
      enforceSSL: true,
    });

    const scanQueue = new sqs.Queue(this, "ScanQueue", {
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: key,
      enforceSSL: true,
      // Long enough for a large monorepo scan to finish before redelivery.
      visibilityTimeout: Duration.minutes(30),
      deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 3 },
    });

    // ------------------------------------------------------------ database
    const database = new rds.DatabaseCluster(this, "Database", {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 8,
      defaultDatabaseName: "ironbastion",
      credentials: rds.Credentials.fromGeneratedSecret("ironbastion"),
      storageEncrypted: true,
      storageEncryptionKey: key,
      backup: { retention: Duration.days(retain ? 14 : 1) },
      removalPolicy,
    });

    // ----------------------------------------------------------------- auth
    const userPool = new cognito.UserPool(this, "Users", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      standardAttributes: { email: { required: true, mutable: false } },
      customAttributes: {
        tenant_id: new cognito.StringAttribute({ mutable: true }),
        role: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 14,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy,
    });

    const userPoolClient = userPool.addClient("Console", {
      authFlows: { userSrp: true },
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // --------------------------------------------------------- compute base
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const environment: Record<string, string> = {
      NODE_ENV: "production",
      AWS_REGION: this.region,
      ANTHROPIC_AWS_WORKSPACE_ID: props.anthropicWorkspaceId,
      IRONBASTION_MODEL_PROVIDER: "aws",
      SCAN_QUEUE_URL: scanQueue.queueUrl,
      ARTEFACT_BUCKET: artefacts.bucketName,
      COGNITO_USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      CERTIFY_KMS_KEY_ARN: certifyKey.keyArn,
    };

    const secrets = {
      DATABASE_SECRET: ecs.Secret.fromSecretsManager(database.secret!),
    };

    /**
     * Least privilege for Claude Platform on AWS: the five actions inference
     * needs, bound to this workspace only. No API key is issued, so
     * CallWithBearerToken is deliberately absent.
     */
    const claudePolicy = new iam.PolicyStatement({
      actions: [
        "aws-external-anthropic:CreateInference",
        "aws-external-anthropic:CountTokens",
        "aws-external-anthropic:GetModel",
        "aws-external-anthropic:ListModels",
        "aws-external-anthropic:GetWorkspace",
      ],
      resources: [
        `arn:aws:aws-external-anthropic:${this.region}:${this.account}:workspace/${props.anthropicWorkspaceId}`,
      ],
    });

    // ------------------------------------------------------------ api tier
    const api = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "Api", {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      // Keep capacity through a deployment rather than halving it.
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      publicLoadBalancer: true,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(repoRoot, {
          file: "apps/api/Dockerfile",
          exclude: ["node_modules", "**/dist", ".git", "cdk.out"],
        }),
        containerPort: 8787,
        environment,
        secrets,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: "api",
          logRetention: logs.RetentionDays.ONE_MONTH,
        }),
      },
    });

    api.targetGroup.configureHealthCheck({
      path: "/health",
      healthyThresholdCount: 2,
      interval: Duration.seconds(15),
    });
    api.service.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 8 }).scaleOnCpuUtilization("ApiCpu", {
      targetUtilizationPercent: 60,
    });

    // --------------------------------------------------------- worker tier
    const workerTask = new ecs.FargateTaskDefinition(this, "WorkerTask", {
      cpu: 2048,
      memoryLimitMiB: 8192,
      // Clones land here and are destroyed with the task.
      ephemeralStorageGiB: 40,
    });

    workerTask.addContainer("worker", {
      image: ecs.ContainerImage.fromAsset(repoRoot, {
        file: "apps/worker/Dockerfile",
        exclude: ["node_modules", "**/dist", ".git", "cdk.out"],
      }),
      environment,
      secrets,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "worker",
        logRetention: logs.RetentionDays.ONE_MONTH,
      }),
    });

    const worker = new ecs.FargateService(this, "Worker", {
      cluster,
      taskDefinition: workerTask,
      desiredCount: 1,
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      circuitBreaker: { rollback: true },
    });

    // Scans are model- and IO-bound, so scale on backlog, not on CPU.
    worker
      .autoScaleTaskCount({ minCapacity: 1, maxCapacity: 20 })
      .scaleOnMetric("WorkerBacklog", {
        metric: scanQueue.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(1),
        }),
        adjustmentType: appscaling.AdjustmentType.CHANGE_IN_CAPACITY,
        scalingSteps: [
          { upper: 0, change: -1 },
          { lower: 5, change: +2 },
          { lower: 25, change: +5 },
        ],
        cooldown: Duration.minutes(2),
      });

    // -------------------------------------------------------------- grants
    for (const role of [api.taskDefinition.taskRole, workerTask.taskRole]) {
      role.addToPrincipalPolicy(claudePolicy);
      artefacts.grantReadWrite(role);
      key.grantEncryptDecrypt(role);
      certifyKey.grant(role, "kms:Sign", "kms:GetPublicKey");
      database.secret?.grantRead(role);
    }
    scanQueue.grantSendMessages(api.taskDefinition.taskRole);
    scanQueue.grantConsumeMessages(workerTask.taskRole);

    database.connections.allowDefaultPortFrom(api.service, "api");
    database.connections.allowDefaultPortFrom(worker, "worker");

    // ------------------------------------------------------------- console
    const consoleBucket = new s3.Bucket(this, "Console", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "ConsoleCdn", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(consoleBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        // Same-origin API, so the console needs no CORS and no base URL.
        "/v1/*": {
          origin: new origins.LoadBalancerV2Origin(api.loadBalancer, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
      },
      defaultRootObject: "index.html",
      // A single-page app owns its routing; 403/404 are its problem, not S3's.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
      ],
    });

    if (props.consoleDist) {
      new s3deploy.BucketDeployment(this, "ConsoleDeployment", {
        sources: [s3deploy.Source.asset(path.resolve(props.consoleDist))],
        destinationBucket: consoleBucket,
        distribution,
        distributionPaths: ["/*"],
      });
    }

    // ------------------------------------------------------------- outputs
    new CfnOutput(this, "ConsoleUrl", { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, "ApiUrl", { value: `http://${api.loadBalancer.loadBalancerDnsName}` });
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "ScanQueueUrl", { value: scanQueue.queueUrl });
    new CfnOutput(this, "DatabaseEndpoint", { value: database.clusterEndpoint.hostname });
    new CfnOutput(this, "ArtefactBucket", { value: artefacts.bucketName });
    new CfnOutput(this, "CertifyKmsKeyArn", { value: certifyKey.keyArn });
  }
}
