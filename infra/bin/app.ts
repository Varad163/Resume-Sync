#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { PlatformStack } from "../lib/platform-stack.js";

const app = new App();

const workspaceId =
  app.node.tryGetContext("anthropicWorkspaceId") ?? process.env["ANTHROPIC_AWS_WORKSPACE_ID"];

if (!workspaceId) {
  throw new Error(
    "Set the Claude Platform on AWS workspace: cdk deploy -c anthropicWorkspaceId=wrkspc_...",
  );
}

new PlatformStack(app, process.env["STACK_NAME"] ?? "IronBastion", {
  anthropicWorkspaceId: String(workspaceId),
  retainData: app.node.tryGetContext("retainData") !== "false",
  ...(app.node.tryGetContext("consoleDist")
    ? { consoleDist: String(app.node.tryGetContext("consoleDist")) }
    : {}),
  env: {
    account: process.env["CDK_DEFAULT_ACCOUNT"],
    region: process.env["CDK_DEFAULT_REGION"] ?? "us-west-2",
  },
  description: "IronBastion quantum security platform",
});
