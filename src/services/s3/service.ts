import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export interface S3Service {
  storeEmailHtml(emailId: string, html: string): Promise<string>;
  getEmailHtml(emailId: string): Promise<string | null>;
}

export class S3ServiceImpl implements S3Service {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.bucketName = process.env.AWS_BUCKET_NAME!;
  }

  async storeEmailHtml(emailId: string, html: string): Promise<string> {
    const key = `emails/${emailId}.html`;
    
    console.log(`Storing HTML for email ${emailId} in bucket: ${this.bucketName}, key: ${key}`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: html,
      ContentType: 'text/html',
      Metadata: {
        emailId,
        createdAt: new Date().toISOString(),
      },
    });

    await this.client.send(command);
    return key;
  }

  async getEmailHtml(emailId: string): Promise<string | null> {
    const key = `emails/${emailId}.html`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return null;
      }

      const html = await response.Body.transformToString();
      return html;
    } catch (error) {
      console.error(`Failed to retrieve email HTML for ${emailId}:`, error);
      return null;
    }
  }
}

export const getS3Service = (): S3Service => {
  return new S3ServiceImpl();
};