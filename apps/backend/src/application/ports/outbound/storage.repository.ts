export interface IStorageRepository {
  upload(key: string, buffer: Buffer, mimetype: string): Promise<string>
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>
  delete(key: string): Promise<void>
}
