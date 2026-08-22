/**
 * The scan queue.
 *
 * SQS in AWS; an in-process queue for local development and tests, so the whole
 * platform runs on a laptop with no infrastructure. Both satisfy the same
 * interface, and the API never knows which one it is talking to.
 */

export interface ScanMessage {
  readonly scanId: string;
  readonly tenantId: string;
}

export interface Queue {
  readonly id: string;
  enqueue(message: ScanMessage): Promise<void>;
  /** Long-polls. Returns an empty array when nothing arrives in time. */
  receive(max: number): Promise<{ message: ScanMessage; ack: () => Promise<void> }[]>;
  close(): Promise<void>;
}

export function createInProcessQueue(
  onEnqueue?: (message: ScanMessage) => void,
): Queue & { pending: ScanMessage[] } {
  const pending: ScanMessage[] = [];

  return {
    id: "in-process",
    pending,
    async enqueue(message) {
      pending.push(message);
      onEnqueue?.(message);
    },
    async receive(max) {
      const taken = pending.splice(0, max);
      return taken.map((message) => ({ message, ack: async () => {} }));
    },
    async close() {
      pending.length = 0;
    },
  };
}

export async function createSqsQueue(queueUrl: string, region?: string): Promise<Queue> {
  const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } =
    await import("@aws-sdk/client-sqs");
  const client = new SQSClient(region ? { region } : {});

  return {
    id: "sqs",
    async enqueue(message) {
      await client.send(
        new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(message) }),
      );
    },
    async receive(max) {
      const response = await client.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: Math.min(10, max),
          WaitTimeSeconds: 20,
          // A scan can run for many minutes; the visibility window has to cover it.
          VisibilityTimeout: 1800,
        }),
      );
      return (response.Messages ?? []).flatMap((sqsMessage) => {
        if (!sqsMessage.Body) return [];
        let parsed: ScanMessage;
        try {
          parsed = JSON.parse(sqsMessage.Body) as ScanMessage;
        } catch {
          return [];
        }
        return [
          {
            message: parsed,
            ack: async () => {
              await client.send(
                new DeleteMessageCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: sqsMessage.ReceiptHandle!,
                }),
              );
            },
          },
        ];
      });
    },
    async close() {
      client.destroy();
    },
  };
}

export async function createQueue(env: NodeJS.ProcessEnv = process.env): Promise<Queue> {
  const url = env["SCAN_QUEUE_URL"];
  if (url) return createSqsQueue(url, env["AWS_REGION"]);
  return createInProcessQueue();
}
