import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackingStartDate1706800000000 implements MigrationInterface {
  name = 'AddTrackingStartDate1706800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "circle_memberships"
      ADD COLUMN IF NOT EXISTS "trackingStartDate" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "circle_memberships"
      DROP COLUMN IF EXISTS "trackingStartDate"
    `);
  }
}
