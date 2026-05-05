import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { IStorageRepository } from '../../../../application/ports/outbound/storage.repository'

export class S3Adapter implements IStorageRepository {
  private client: S3Client
  private bucket: string
  private bucketReady?: Promise<void>

  constructor(config: {
    endpoint:  string
    publicEndpoint?: string
    region:    string
    bucket:    string
    accessKey: string
    secretKey: string
  }) {
    this.bucket = config.bucket
    const credentials = {
      accessKeyId:     config.accessKey,
      secretAccessKey: config.secretKey,
    }
    this.client = new S3Client({
      endpoint:           config.endpoint,
      region:             config.region,
      credentials,
      forcePathStyle: true,
    })
    this.presignClient = new S3Client({
      endpoint:           config.publicEndpoint ?? config.endpoint,
      region:             config.region,
      credentials,
      forcePathStyle: true,
    })
  }

  private presignClient: S3Client

  private async ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))
        .then(() => undefined)
        .catch(async () => {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }))
        })
    }

    return this.bucketReady
  }

  async upload(key: string, buffer: Buffer, mimetype: string): Promise<string> {
    await this.ensureBucket()
    await this.client.send(new PutObjectCommand({
      Bucket:      this.bucket,
      Key:         key,
      Body:        buffer,
      ContentType: mimetype,
    }))
    return key
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.presignClient, cmd, { expiresIn })
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
